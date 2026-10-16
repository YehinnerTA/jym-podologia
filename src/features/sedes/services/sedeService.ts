import {
    collection,
    doc,
    getDocs,
    getDoc,
    query,
    orderBy,
    where,
    limit,
    serverTimestamp,
    writeBatch,
    deleteDoc,
    arrayUnion,
    DocumentReference,
} from 'firebase/firestore';

import { db, auth } from '../../../config/firebase';
import { Sede, SedeFormData } from '../sede';

const COLLECTION = 'sedes';

// Límite conservador de operaciones por lote.
// Incluye creación de sede, administradores
// y cambios de sede predeterminada.
const MAX_BATCH_WRITES = 450;

const getSedeRef = (id: string) =>
    doc(db, COLLECTION, id);

const getSedesCollection = () =>
    collection(db, COLLECTION);

// Obtener las otras sedes predeterminadas.
const getOtherDefaultSedes = async (
    exceptId?: string
) => {
    const snapshot = await getDocs(
        query(
            getSedesCollection(),
            where('esPredeterminada', '==', true)
        )
    );

    return snapshot.docs.filter(
        (documento) => documento.id !== exceptId
    );
};

// Localizar los perfiles de personas correspondientes
// a los usuarios administradores activos.
const getAdminPersonRefs = async (): Promise<
    DocumentReference[]
> => {
    // El rol real se obtiene de usuarios,
    // no solamente de personas.tipo.
    const usuariosSnapshot = await getDocs(
        query(
            collection(db, 'usuarios'),
            where('rol', '==', 'admin')
        )
    );

    const adminUids = new Set(
        usuariosSnapshot.docs
            .filter(
                (documento) =>
                    documento.data().activo === true
            )
            .map((documento) => documento.id)
    );

    if (adminUids.size === 0) {
        throw new Error(
            'No existen administradores activos para asignar la nueva sede.'
        );
    }

    // Buscar los perfiles de administradores.
    const personasSnapshot = await getDocs(
        query(
            collection(db, 'personas'),
            where('tipo', '==', 'admin')
        )
    );

    const perfiles = personasSnapshot.docs.filter(
        (documento) => {
            const persona = documento.data();

            return (
                persona.activo === true &&
                typeof persona.authUid === 'string' &&
                adminUids.has(persona.authUid)
            );
        }
    );

    // Evitar registrar una sede cuando no se
    // puede asignar a todos los administradores activos.
    const encontrados = new Set(
        perfiles.map(
            (documento) =>
                documento.data().authUid as string
        )
    );

    const sinPerfil = [...adminUids].filter(
        (uid) => !encontrados.has(uid)
    );

    if (sinPerfil.length > 0) {
        throw new Error(
            'Existen administradores activos sin un perfil de persona activo y correctamente vinculado. Corrige esos registros antes de crear la sede.'
        );
    }

    return perfiles.map(
        (documento) => documento.ref
    );
};

// Verificar si la sede tiene registros relacionados.
const hasRelatedDocuments = async (
    collectionName: string,
    field: string,
    operator: '==' | 'array-contains',
    sedeId: string
): Promise<boolean> => {
    const snapshot = await getDocs(
        query(
            collection(db, collectionName),
            where(field, operator, sedeId),
            limit(1)
        )
    );

    return !snapshot.empty;
};

export const sedeService = {

    // Obtener todas las sedes.
    async getAll(): Promise<Sede[]> {
        const snapshot = await getDocs(
            query(
                getSedesCollection(),
                orderBy('nombre', 'asc')
            )
        );

        return snapshot.docs.map(
            (documento) => ({
                id: documento.id,
                ...documento.data(),
            } as Sede)
        );
    },

    // Obtener una sede por su ID.
    async getById(
        id: string
    ): Promise<Sede | null> {
        if (!id) return null;

        const snapshot = await getDoc(
            getSedeRef(id)
        );

        if (!snapshot.exists()) {
            return null;
        }

        return {
            id: snapshot.id,
            ...snapshot.data(),
        } as Sede;
    },

    /**
     * Crear una sede y asignarla automáticamente
     * a todos los administradores activos.
     *
     * Las escrituras se agrupan en un solo lote:
     * - Crear la sede.
     * - Actualizar personas.sedesIds de administradores.
     * - Actualizar las sedes predeterminadas.
     */
    async create(
        data: SedeFormData,
        userId: string
    ): Promise<string> {
        if (!userId) {
            throw new Error(
                'No se pudo identificar al usuario.'
            );
        }

        // Verificación adicional del usuario actual.
        // La autorización definitiva depende
        // de las reglas de Firestore.
        if (
            !auth.currentUser ||
            auth.currentUser.uid !== userId
        ) {
            throw new Error(
                'La sesión no es válida para crear sedes.'
            );
        }

        const usuarioSnapshot = await getDoc(
            doc(db, 'usuarios', userId)
        );

        if (
            !usuarioSnapshot.exists() ||
            usuarioSnapshot.data().rol !== 'admin' ||
            usuarioSnapshot.data().activo !== true
        ) {
            throw new Error(
                'Solo un administrador activo puede crear sedes.'
            );
        }

        // Preparar las referencias de todos
        // los administradores activos.
        const administradores =
            await getAdminPersonRefs();

        // Generar el ID antes de guardar.
        const nuevaSedeRef = doc(
            getSedesCollection()
        );

        // Preparar actualizaciones de la
        // sede predeterminada, si corresponde.
        const anteriores = data.esPredeterminada
            ? await getOtherDefaultSedes()
            : [];

        const totalEscrituras =
            1 +
            administradores.length +
            anteriores.length;

        if (totalEscrituras > MAX_BATCH_WRITES) {
            throw new Error(
                'La cantidad de administradores y sedes excede el límite de esta operación. Se necesita un procedimiento de creación desde el servidor.'
            );
        }

        const batch = writeBatch(db);

        // 1. Crear la sede.
        batch.set(nuevaSedeRef, {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: userId,
        });

        // 2. Agregar el ID de la nueva sede
        // a todos los administradores activos.
        administradores.forEach((personaRef) => {
            batch.update(personaRef, {
                sedesIds: arrayUnion(
                    nuevaSedeRef.id
                ),
                updatedAt: serverTimestamp(),
            });
        });

        // 3. Si la nueva sede es predeterminada,
        // quitar esa condición de las anteriores.
        anteriores.forEach((documento) => {
            batch.update(documento.ref, {
                esPredeterminada: false,
                updatedAt: serverTimestamp(),
            });
        });

        // 4. Confirmar todas las escrituras juntas.
        await batch.commit();

        return nuevaSedeRef.id;
    },

    // Editar una sede existente.
    async update(
        id: string,
        data: SedeFormData
    ): Promise<void> {
        if (!id) {
            throw new Error(
                'No se identificó la sede.'
            );
        }

        const sedeRef = getSedeRef(id);

        const snapshot = await getDoc(
            sedeRef
        );

        if (!snapshot.exists()) {
            throw new Error(
                'La sede que intentas editar ya no existe.'
            );
        }

        const anteriores = data.esPredeterminada
            ? await getOtherDefaultSedes(id)
            : [];

        if (
            1 + anteriores.length >
            MAX_BATCH_WRITES
        ) {
            throw new Error(
                'Demasiadas sedes predeterminadas para actualizar.'
            );
        }

        const batch = writeBatch(db);

        anteriores.forEach((documento) => {
            batch.update(documento.ref, {
                esPredeterminada: false,
                updatedAt: serverTimestamp(),
            });
        });

        batch.update(sedeRef, {
            ...data,
            updatedAt: serverTimestamp(),
        });

        await batch.commit();
    },

    // Eliminar una sede sin relaciones.
    async remove(id: string): Promise<void> {
        if (!id) {
            throw new Error(
                'No se identificó la sede.'
            );
        }

        const sedeRef = getSedeRef(id);

        const snapshot = await getDoc(
            sedeRef
        );

        if (!snapshot.exists()) {
            throw new Error(
                'La sede ya no existe.'
            );
        }

        // Comprobar personas vinculadas.
        const tienePersonas =
            await hasRelatedDocuments(
                'personas',
                'sedesIds',
                'array-contains',
                id
            );

        if (tienePersonas) {
            throw new Error(
                'No se puede eliminar esta sede porque tiene personas asignadas. Puedes desactivarla desde Editar Sede.'
            );
        }

        // Comprobar servicios vinculados.
        const tieneServicios =
            await hasRelatedDocuments(
                'servicios',
                'sedesIds',
                'array-contains',
                id
            );

        if (tieneServicios) {
            throw new Error(
                'No se puede eliminar esta sede porque tiene servicios vinculados. Puedes desactivarla desde Editar Sede.'
            );
        }

        // Comprobar citas existentes.
        const tieneCitas =
            await hasRelatedDocuments(
                'citas',
                'sedeId',
                '==',
                id
            );

        if (tieneCitas) {
            throw new Error(
                'No se puede eliminar esta sede porque tiene citas registradas. Puedes desactivarla desde Editar Sede.'
            );
        }

        await deleteDoc(sedeRef);
    },

    // Desmarcar otras sedes predeterminadas.
    async clearPredeterminada(
        exceptId?: string
    ): Promise<void> {
        const anteriores =
            await getOtherDefaultSedes(exceptId);

        if (
            anteriores.length >
            MAX_BATCH_WRITES
        ) {
            throw new Error(
                'Demasiadas sedes para actualizar en un solo lote.'
            );
        }

        if (anteriores.length === 0) {
            return;
        }

        const batch = writeBatch(db);

        anteriores.forEach((documento) => {
            batch.update(documento.ref, {
                esPredeterminada: false,
                updatedAt: serverTimestamp(),
            });
        });

        await batch.commit();
    },
};
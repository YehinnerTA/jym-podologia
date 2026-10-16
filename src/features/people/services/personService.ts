import {
    collection,
    doc,
    getDocs,
    getDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    writeBatch,
} from 'firebase/firestore';

import {
    createUserWithEmailAndPassword,
    deleteUser,
    getAuth,
    inMemoryPersistence,
    setPersistence,
    signOut,
    User as FirebaseUser,
} from 'firebase/auth';

import {
    initializeApp,
    deleteApp,
} from 'firebase/app';

import { auth, db } from '../../../config/firebase';
import { Persona, PersonaFormData } from '../person';

const COLLECTION = 'personas';

interface UpdateOptions {
    newPassword?: string;
    closeSessionAfter?: boolean;
}

interface AccountRole {
    rol: string;
    subRol: string | null;
}

type AuthorizedRole = 'admin' | 'staff';

interface AuthorizedSession {
    uid: string;
    role: AuthorizedRole;
}

// Verificar la sesión actual y el rol.
const getAuthorizedSession =
    async (): Promise<AuthorizedSession> => {

        const firebaseUser = auth.currentUser;

        if (!firebaseUser) {
            throw new Error(
                'Tu sesión ha finalizado. Inicia sesión nuevamente.'
            );
        }

        const usuarioSnapshot = await getDoc(
            doc(db, 'usuarios', firebaseUser.uid)
        );

        if (!usuarioSnapshot.exists()) {
            throw new Error(
                'Tu cuenta no está registrada en Firestore.'
            );
        }

        const usuario = usuarioSnapshot.data();

        if (usuario.activo !== true) {
            throw new Error(
                'Tu cuenta está desactivada.'
            );
        }

        if (
            usuario.rol !== 'admin' &&
            usuario.rol !== 'staff'
        ) {
            throw new Error(
                'No tienes permisos para gestionar personas.'
            );
        }

        if (
            usuario.rol === 'staff' &&
            !['medico', 'recepcion'].includes(
                usuario.subRol
            )
        ) {
            throw new Error(
                'Tu cuenta no tiene un subrol autorizado.'
            );
        }

        return {
            uid: firebaseUser.uid,
            role: usuario.rol as AuthorizedRole,
        };
    };

// Staff solo puede gestionar pacientes.
const assertCanManagePersona = (
    role: AuthorizedRole,
    persona: Persona
): void => {
    if (role === 'admin') return;

    if (
        persona.tipo !== 'paciente' ||
        persona.esTrabajador === true ||
        !!persona.authUid
    ) {
        throw new Error(
            'No tienes permisos para gestionar cuentas de trabajadores.'
        );
    }
};

const assertCanCreate = (
    role: AuthorizedRole,
    data: PersonaFormData
): void => {
    if (role === 'admin') return;

    if (
        data.tipo !== 'paciente' ||
        data.esTrabajador !== false
    ) {
        throw new Error(
            'Los médicos y recepcionistas solo pueden registrar pacientes.'
        );
    }
};

// Comprobar coherencia entre tipo y trabajador.
const validatePersonaType = (
    data: PersonaFormData
): void => {
    if (!data.esTrabajador) {
        if (data.tipo !== 'paciente') {
            throw new Error(
                'Un paciente debe tener el tipo paciente.'
            );
        }

        return;
    }

    if (
        data.tipo !== 'admin' &&
        data.tipo !== 'medico' &&
        data.tipo !== 'recepcionista'
    ) {
        throw new Error(
            'Selecciona un tipo de trabajador válido.'
        );
    }
};

// Roles utilizados en Firestore.
const getAccountRole = (
    tipo: PersonaFormData['tipo']
): AccountRole => {
    switch (tipo) {
        case 'admin':
            return {
                rol: 'admin',
                subRol: null,
            };

        case 'medico':
            return {
                rol: 'staff',
                subRol: 'medico',
            };

        case 'recepcionista':
            return {
                rol: 'staff',
                subRol: 'recepcion',
            };

        default:
            throw new Error(
                'Tipo de trabajador no válido.'
            );
    }
};

// Administradores: todas las sedes,
// incluidas las inactivas.
const getAllSedesIds = async (): Promise<string[]> => {
    const snapshot = await getDocs(
        collection(db, 'sedes')
    );

    return snapshot.docs.map(
        (documento) => documento.id
    );
};

// Las asignaciones de trabajadores
// se mantienen como antes.
//
// Los pacientes no necesitan sedesIds
// porque se comparten entre sedes.
const resolveSedesIds = async (
    data: PersonaFormData
): Promise<string[]> => {
    if (!data.esTrabajador) {
        return [];
    }

    if (data.tipo === 'admin') {
        return [
            ...new Set(await getAllSedesIds()),
        ];
    }

    return [
        ...new Set(
            (data.sedesIds || []).filter(
                (id): id is string =>
                    typeof id === 'string' &&
                    id.trim().length > 0
            )
        ),
    ];
};

// NUEVO:
// Validar la sede de origen al crear
// un paciente.
//
// La sede la proporciona el contexto
// del header a través de PersonForm.
//
// No se solicita al paciente ni se
// presenta como campo de formulario.
const validarSedeOrigen = async (
    sedeOrigenId?: string
): Promise<string> => {
    const id = sedeOrigenId?.trim();

    if (!id) {
        throw new Error(
            'Selecciona una sede en el encabezado antes de registrar al paciente.'
        );
    }

    const sedeSnapshot = await getDoc(
        doc(db, 'sedes', id)
    );

    if (
        !sedeSnapshot.exists() ||
        sedeSnapshot.data().activo !== true
    ) {
        throw new Error(
            'La sede seleccionada no existe o está inactiva. Selecciona una sede válida.'
        );
    }

    return id;
};

const validarCuentaTrabajador = (
    data: PersonaFormData,
    password?: string
): void => {
    if (!data.esTrabajador) return;

    const email = data.username?.trim() || '';

    if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
        throw new Error(
            'El correo del trabajador no es válido.'
        );
    }

    if (!password || password.length < 6) {
        throw new Error(
            'La contraseña debe tener al menos 6 caracteres.'
        );
    }
};

const validarSedesTrabajador = (
    data: PersonaFormData,
    sedesIds: string[]
): void => {
    if (
        data.esTrabajador &&
        data.tipo !== 'admin' &&
        sedesIds.length === 0
    ) {
        throw new Error(
            'Selecciona al menos una sede para el trabajador.'
        );
    }
};

const readPersona = async (
    id: string
): Promise<Persona | null> => {
    if (!id) return null;

    const snapshot = await getDoc(
        doc(db, COLLECTION, id)
    );

    if (!snapshot.exists()) return null;

    return {
        ...snapshot.data(),
        id: snapshot.id,
    } as Persona;
};

export const personService = {

    // Consultar todas las personas (admin)
    // o solamente pacientes (staff).
    async getAll(): Promise<Persona[]> {
        const session = await getAuthorizedSession();

        const personasRef = collection(
            db,
            COLLECTION
        );

        const consulta =
            session.role === 'admin'
                ? query(
                    personasRef,
                    orderBy('nombre', 'asc')
                )
                : query(
                    personasRef,
                    where('tipo', '==', 'paciente')
                );

        const snapshot = await getDocs(consulta);

        const registros = snapshot.docs.map(
            (documento) => ({
                ...documento.data(),
                id: documento.id,
            } as Persona)
        );

        const permitidos =
            session.role === 'admin'
                ? registros
                : registros.filter(
                    (persona) =>
                        persona.tipo === 'paciente' &&
                        persona.esTrabajador !== true &&
                        !persona.authUid
                );

        return permitidos.sort(
            (a, b) =>
                (a.nombre || '').localeCompare(
                    b.nombre || '',
                    'es'
                )
        );
    },

    async getById(
        id: string
    ): Promise<Persona | null> {
        const session = await getAuthorizedSession();

        const persona = await readPersona(id);

        if (!persona) return null;

        assertCanManagePersona(
            session.role,
            persona
        );

        return persona;
    },

    /**
     * Crear persona.
     *
     * Pacientes:
     * guardar sedeOrigenId automáticamente.
     *
     * Trabajadores:
     * conservar el flujo actual de
     * Firebase Authentication.
     *
     * El cuarto argumento solo se utiliza
     * para el registro de pacientes.
     */
    async create(
        data: PersonaFormData,
        userId: string,
        password?: string,
        sedeOrigenId?: string
    ): Promise<string> {
        const session = await getAuthorizedSession();

        if (session.uid !== userId) {
            throw new Error(
                'El usuario que registra no coincide con la sesión actual.'
            );
        }

        validatePersonaType(data);

        assertCanCreate(
            session.role,
            data
        );

        if (
            data.esTrabajador &&
            session.role !== 'admin'
        ) {
            throw new Error(
                'Solo los administradores pueden crear cuentas de trabajadores.'
            );
        }

        validarCuentaTrabajador(
            data,
            password
        );

        const sedesIds = await resolveSedesIds(data);

        validarSedesTrabajador(
            data,
            sedesIds
        );

        const nuevaPersonaRef = doc(
            collection(db, COLLECTION)
        );

        // PACIENTE.
        if (!data.esTrabajador) {

            // Obtener y verificar la sede
            // seleccionada en el header.
            const sedeValidada =
                await validarSedeOrigen(sedeOrigenId);

            const batch = writeBatch(db);

            batch.set(
                nuevaPersonaRef,
                {
                    ...data,

                    tipo: 'paciente',
                    esTrabajador: false,
                    username: '',
                    sedesIds: [],
                    authUid: null,

                    // NUEVO:
                    // origen histórico del paciente.
                    sedeOrigenId: sedeValidada,

                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    createdBy: session.uid,
                }
            );

            await batch.commit();

            return nuevaPersonaRef.id;
        }

        // TRABAJADOR.
        // No alteramos la creación de cuentas.
        const { rol, subRol } =
            getAccountRole(data.tipo);

        const secondaryApp = initializeApp(
            auth.app.options,
            `secondary-create-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2)}`
        );

        const secondaryAuth =
            getAuth(secondaryApp);

        let createdAuthUser: FirebaseUser | null = null;
        let firestoreCommitted = false;

        try {
            await setPersistence(
                secondaryAuth,
                inMemoryPersistence
            );

            const credential =
                await createUserWithEmailAndPassword(
                    secondaryAuth,
                    data.username!.trim(),
                    password!
                );

            createdAuthUser = credential.user;

            const uid = createdAuthUser.uid;

            const batch = writeBatch(db);

            batch.set(
                doc(db, 'usuarios', uid),
                {
                    email: data.username!.trim(),
                    nombre: data.nombre,
                    rol,
                    subRol,
                    activo: data.activo,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                }
            );

            batch.set(
                nuevaPersonaRef,
                {
                    ...data,
                    sedesIds,
                    authUid: uid,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    createdBy: session.uid,
                }
            );

            await batch.commit();

            firestoreCommitted = true;

            return nuevaPersonaRef.id;

        } catch (error) {
            console.error(
                'Error creando trabajador:',
                error
            );

            if (
                createdAuthUser &&
                !firestoreCommitted
            ) {
                try {
                    await deleteUser(createdAuthUser);
                } catch (cleanupError) {
                    console.error(
                        'Error revirtiendo Authentication:',
                        cleanupError
                    );

                    throw new Error(
                        'El registro no se completó. La cuenta creada en Authentication no pudo revertirse. Revisa Firebase Console antes de volver a intentarlo.'
                    );
                }
            }

            throw error;

        } finally {
            try {
                await deleteApp(secondaryApp);
            } catch (cleanupError) {
                console.error(
                    'Error cerrando instancia secundaria:',
                    cleanupError
                );
            }
        }
    },

    /**
     * Editar persona.
     *
     * sedeOrigenId no está en PersonaFormData,
     * por lo que no se envía durante la edición.
     *
     * Firestore conserva el valor original
     * cuando update() modifica otros campos.
     */
    async update(
        id: string,
        data: PersonaFormData,
        options: UpdateOptions = {}
    ): Promise<void> {
        const session = await getAuthorizedSession();

        const original = await readPersona(id);

        if (!original) {
            throw new Error(
                'Persona no encontrada.'
            );
        }

        assertCanManagePersona(
            session.role,
            original
        );

        validatePersonaType(data);

        assertCanCreate(
            session.role,
            data
        );

        if (options.newPassword) {
            throw new Error(
                'El cambio de contraseña debe realizarse mediante un procedimiento específico de Firebase Authentication.'
            );
        }

        if (
            original.esTrabajador !==
            data.esTrabajador
        ) {
            throw new Error(
                'No se puede cambiar la condición de trabajador desde esta edición.'
            );
        }

        if (
            original.tipo !==
            data.tipo
        ) {
            throw new Error(
                'El cambio de tipo de usuario requiere un procedimiento administrativo seguro.'
            );
        }

        if (
            data.esTrabajador &&
            original.username !== data.username
        ) {
            throw new Error(
                'El cambio de correo requiere actualizar Firebase Authentication.'
            );
        }

        if (
            data.esTrabajador &&
            !original.authUid
        ) {
            throw new Error(
                'Este trabajador no tiene una cuenta de Authentication vinculada.'
            );
        }

        const sedesIds =
            await resolveSedesIds(data);

        validarSedesTrabajador(
            data,
            sedesIds
        );

        const batch = writeBatch(db);

        const datosActualizados =
            session.role === 'staff'
                ? {
                    ...data,
                    tipo: 'paciente' as const,
                    esTrabajador: false,
                    username: '',
                    sedesIds: [],
                    authUid: null,
                    updatedAt: serverTimestamp(),
                }
                : {
                    ...data,
                    sedesIds,
                    authUid: original.authUid || null,
                    updatedAt: serverTimestamp(),
                };

        // No incluimos sedeOrigenId.
        // Se preserva su valor existente.
        batch.update(
            doc(db, COLLECTION, id),
            datosActualizados
        );

        if (original.authUid) {
            const usuarioRef = doc(
                db,
                'usuarios',
                original.authUid
            );

            const usuarioSnapshot =
                await getDoc(usuarioRef);

            if (!usuarioSnapshot.exists()) {
                throw new Error(
                    'El usuario vinculado no existe en Firestore.'
                );
            }

            batch.update(
                usuarioRef,
                {
                    nombre: data.nombre,
                    activo: data.activo,
                    updatedAt: serverTimestamp(),
                }
            );
        }

        await batch.commit();

        if (options.closeSessionAfter) {
            await signOut(auth);
        }
    },

    /**
     * Activar o desactivar una persona.
     *
     * No modifica sedeOrigenId.
     */
    async setActivo(
        id: string,
        activo: boolean
    ): Promise<void> {
        const session = await getAuthorizedSession();

        const original = await readPersona(id);

        if (!original) {
            throw new Error(
                'Persona no encontrada.'
            );
        }

        assertCanManagePersona(
            session.role,
            original
        );

        if (
            original.authUid === session.uid &&
            activo === false
        ) {
            throw new Error(
                'No puedes desactivar tu propia cuenta desde Personas.'
            );
        }

        const batch = writeBatch(db);

        batch.update(
            doc(db, COLLECTION, id),
            {
                activo,
                updatedAt: serverTimestamp(),
            }
        );

        if (original.authUid) {
            const usuarioRef = doc(
                db,
                'usuarios',
                original.authUid
            );

            const usuarioSnapshot =
                await getDoc(usuarioRef);

            if (!usuarioSnapshot.exists()) {
                throw new Error(
                    'No existe la cuenta de acceso vinculada.'
                );
            }

            batch.update(
                usuarioRef,
                {
                    activo,
                    updatedAt: serverTimestamp(),
                }
            );
        }

        await batch.commit();
    },
};
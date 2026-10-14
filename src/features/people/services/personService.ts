import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    serverTimestamp,
    setDoc,
} from 'firebase/firestore';
import {
    createUserWithEmailAndPassword,
    getAuth,
    signOut,
    updatePassword as fbUpdatePassword,
} from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { auth, db } from '../../../config/firebase';
import { Persona, PersonaFormData } from '../person';

const COLLECTION = 'personas';

interface UpdateOptions {
    newPassword?: string;
    closeSessionAfter?: boolean; // true si el usuario se está editando a sí mismo
}

export const personService = {
    async getAll(): Promise<Persona[]> {
        const q = query(collection(db, COLLECTION), orderBy('nombre', 'asc'));
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Persona));
    },

    async getById(id: string): Promise<Persona | null> {
        const ref = doc(db, COLLECTION, id);
        const snap = await getDoc(ref);
        if (!snap.exists()) return null;
        return { id: snap.id, ...snap.data() } as Persona;
    },

    async create(data: PersonaFormData, userId: string, password?: string): Promise<string> {
        let authUid: string | undefined;
        let rol = 'paciente';
        let subRol: string | null = null;

        if (data.esTrabajador && data.username && password) {
            const secondaryApp = initializeApp(
                {
                    apiKey: 'AIzaSyAILJOzuioe6Eiu2UcNSwjOZEe9hBQoQ5U',
                    authDomain: 'jym-podogologia-sac.firebaseapp.com',
                    projectId: 'jym-podogologia-sac',
                },
                `secondary-${Date.now()}`
            );
            const secondaryAuth = getAuth(secondaryApp);
            const userCredential = await createUserWithEmailAndPassword(
                secondaryAuth,
                data.username,
                password
            );
            authUid = userCredential.user.uid;
            await deleteApp(secondaryApp);

            if (data.tipo === 'medico') {
                rol = 'staff';
                subRol = 'medico';
            } else if (data.tipo === 'recepcionista') {
                rol = 'staff';
                subRol = 'recepcion';
            } else if (data.tipo === 'admin') {
                rol = 'admin';
                subRol = null;
            }

            await setDoc(doc(db, 'usuarios', authUid), {
                email: data.username,
                nombre: data.nombre,
                rol,
                subRol,
                activo: true,
                createdAt: serverTimestamp(),
            });
        }

        const ref = await addDoc(collection(db, COLLECTION), {
            ...data,
            authUid: authUid || null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: userId,
        });

        return ref.id;
    },

    /**
     * Actualiza una persona.
     * - Si cambia el correo (username) o se pasa una nueva contraseña,
     *   se crea una nueva cuenta Auth con esos datos.
     * - Si `closeSessionAfter` es true, cierra sesión (caso: usuario editándose a sí mismo).
     */
    async update(
        id: string,
        data: PersonaFormData,
        options: UpdateOptions = {}
    ): Promise<void> {
        const { newPassword, closeSessionAfter } = options;

        // Obtener la persona original para comparar username
        const original = await this.getById(id);
        if (!original) throw new Error('Persona no encontrada');

        const emailChanged = original.username !== data.username;
        const passwordChanged = !!newPassword && newPassword.length >= 6;
        const needsNewAuth = data.esTrabajador && (emailChanged || passwordChanged);

        let newAuthUid: string | undefined;

        // 1. Si es trabajador y hay cambio de correo o contraseña → crear nueva cuenta Auth
        if (needsNewAuth && data.username && newPassword) {
            const secondaryApp = initializeApp(
                {
                    apiKey: 'AIzaSyAILJOzuioe6Eiu2UcNSwjOZEe9hBQoQ5U',
                    authDomain: 'jym-podogologia-sac.firebaseapp.com',
                    projectId: 'jym-podogologia-sac',
                },
                `secondary-update-${Date.now()}`
            );
            const secondaryAuth = getAuth(secondaryApp);
            const userCredential = await createUserWithEmailAndPassword(
                secondaryAuth,
                data.username,
                newPassword
            );
            newAuthUid = userCredential.user.uid;
            await deleteApp(secondaryApp);

            // Definir rol y subRol
            let rol = 'paciente';
            let subRol: string | null = null;
            if (data.tipo === 'medico') {
                rol = 'staff';
                subRol = 'medico';
            } else if (data.tipo === 'recepcionista') {
                rol = 'staff';
                subRol = 'recepcion';
            } else if (data.tipo === 'admin') {
                rol = 'admin';
                subRol = null;
            }

            // Crear nuevo documento en usuarios
            await setDoc(doc(db, 'usuarios', newAuthUid), {
                email: data.username,
                nombre: data.nombre,
                rol,
                subRol,
                activo: true,
                createdAt: serverTimestamp(),
            });

            // Desactivar la cuenta antigua si existía
            if (original.authUid) {
                try {
                    await updateDoc(doc(db, 'usuarios', original.authUid), {
                        activo: false,
                    });
                } catch (e) {
                    console.warn('No se pudo desactivar usuario antiguo:', e);
                }
            }
        }

        // 2. Actualizar el documento de personas
        const ref = doc(db, COLLECTION, id);
        await updateDoc(ref, {
            ...data,
            authUid: newAuthUid || original.authUid || null,
            updatedAt: serverTimestamp(),
        });

        // 3. Si es el propio usuario el que se editó → cerrar sesión
        if (closeSessionAfter && needsNewAuth) {
            await signOut(auth);
        }
    },

    async setActivo(id: string, activo: boolean): Promise<void> {
        const ref = doc(db, COLLECTION, id);
        await updateDoc(ref, {
            activo,
            updatedAt: serverTimestamp(),
        });
    },
};
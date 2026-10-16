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
    where,
    serverTimestamp,
} from 'firebase/firestore';

import { db } from '../../../config/firebase';
import { Servicio, ServicioFormData } from '../service';

const COLLECTION = 'servicios';

export const serviceService = {
    async getAll(): Promise<Servicio[]> {
        const q = query(
            collection(db, COLLECTION),
            orderBy('nombre', 'asc')
        );

        const snap = await getDocs(q);

        return snap.docs.map((d) => ({
            ...d.data(),
            id: d.id,
        } as Servicio));
    },

    async getById(id: string): Promise<Servicio | null> {
        const ref = doc(db, COLLECTION, id);
        const snap = await getDoc(ref);

        if (!snap.exists()) return null;

        return {
            ...snap.data(),
            id: snap.id,
        } as Servicio;
    },

    async getBySede(sedeId: string): Promise<Servicio[]> {
        const q = query(
            collection(db, COLLECTION),
            where('sedesIds', 'array-contains', sedeId),
            where('activo', '==', true)
        );

        const snap = await getDocs(q);

        return snap.docs
            .map((d) => ({
                ...d.data(),
                id: d.id,
            } as Servicio))
            .sort((a, b) =>
                a.nombre.localeCompare(b.nombre, 'es')
            );
    },

    async create(
        data: ServicioFormData,
        userId: string
    ): Promise<string> {
        const ref = await addDoc(
            collection(db, COLLECTION),
            {
                ...data,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: userId,
            }
        );

        return ref.id;
    },

    async update(
        id: string,
        data: ServicioFormData
    ): Promise<void> {
        const ref = doc(db, COLLECTION, id);

        await updateDoc(ref, {
            ...data,
            updatedAt: serverTimestamp(),
        });
    },

    async setActivo(
        id: string,
        activo: boolean
    ): Promise<void> {
        const ref = doc(db, COLLECTION, id);

        await updateDoc(ref, {
            activo,
            updatedAt: serverTimestamp(),
        });
    },

    async remove(id: string): Promise<void> {
        const ref = doc(db, COLLECTION, id);

        await deleteDoc(ref);
    },
};
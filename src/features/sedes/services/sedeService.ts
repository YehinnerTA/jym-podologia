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
    writeBatch,
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { Sede, SedeFormData } from '../sede';

const COLLECTION = 'sedes';

export const sedeService = {
    async getAll(): Promise<Sede[]> {
        const q = query(collection(db, COLLECTION), orderBy('nombre', 'asc'));
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Sede));
    },

    async getById(id: string): Promise<Sede | null> {
        const ref = doc(db, COLLECTION, id);
        const snap = await getDoc(ref);
        if (!snap.exists()) return null;
        return { id: snap.id, ...snap.data() } as Sede;
    },

    async create(data: SedeFormData, userId: string): Promise<string> {
        if (data.esPredeterminada) {
            await this.clearPredeterminada();
        }
        const ref = await addDoc(collection(db, COLLECTION), {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: userId,
        });
        return ref.id;
    },

    async update(id: string, data: SedeFormData): Promise<void> {
        if (data.esPredeterminada) {
            await this.clearPredeterminada(id);
        }
        const ref = doc(db, COLLECTION, id);
        await updateDoc(ref, {
            ...data,
            updatedAt: serverTimestamp(),
        });
    },

    async remove(id: string): Promise<void> {
        const ref = doc(db, COLLECTION, id);
        await deleteDoc(ref);
    },

    async clearPredeterminada(exceptId?: string): Promise<void> {
        const snap = await getDocs(collection(db, COLLECTION));
        const batch = writeBatch(db);
        snap.docs.forEach((d) => {
            if (d.id !== exceptId && d.data().esPredeterminada) {
                batch.update(d.ref, { esPredeterminada: false });
            }
        });
        await batch.commit();
    },
};
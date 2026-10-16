import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp,
} from 'firebase/firestore';

import { db } from '../../../config/firebase';

import {
    Empresa,
    EmpresaFormData,
    EMPRESA_DOCUMENT_ID,
} from '../company';

const COLLECTION_NAME = 'empresa';

const getEmpresaRef = () =>
    doc(db, COLLECTION_NAME, EMPRESA_DOCUMENT_ID);

export const empresaService = {

    async get(): Promise<Empresa | null> {
        const empresaRef = getEmpresaRef();
        const snapshot = await getDoc(empresaRef);

        if (!snapshot.exists()) {
            return null;
        }

        return {
            id: snapshot.id,
            ...snapshot.data(),
        } as Empresa;
    },

    async create(
        data: EmpresaFormData,
        userId: string
    ): Promise<void> {
        const empresaRef = getEmpresaRef();

        const snapshot = await getDoc(empresaRef);

        if (snapshot.exists()) {
            throw new Error(
                'La empresa ya está registrada.'
            );
        }

        await setDoc(empresaRef, {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: userId,
        });
    },

    async update(
        data: Partial<EmpresaFormData>
    ): Promise<void> {
        const empresaRef = getEmpresaRef();

        await updateDoc(empresaRef, {
            ...data,
            updatedAt: serverTimestamp(),
        });
    },

    async exists(): Promise<boolean> {
        const snapshot = await getDoc(
            getEmpresaRef()
        );

        return snapshot.exists();
    },
};
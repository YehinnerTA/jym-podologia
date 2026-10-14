import { useState, useEffect, useCallback } from 'react';
import {
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword,
} from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../../config/firebase';
import { Persona } from '../../people/person';

export const useMyProfile = () => {
    const [persona, setPersona] = useState<Persona | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchProfile = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const user = auth.currentUser;
            if (!user) {
                setError('No hay sesión activa');
                return;
            }

            // Buscar la persona por authUid
            const q = doc(db, 'usuarios', user.uid);
            const userSnap = await getDoc(q);
            if (!userSnap.exists()) {
                setError('No se encontró el perfil');
                return;
            }

            // Buscar la persona asociada al uid
            const personasRef = doc(db, 'personas', user.uid);
            const personaSnap = await getDoc(personasRef);

            // Si no existe por uid, buscar por authUid
            if (!personaSnap.exists()) {
                const { collection, query, where, getDocs } = await import('firebase/firestore');
                const q2 = query(collection(db, 'personas'), where('authUid', '==', user.uid));
                const snap2 = await getDocs(q2);
                if (snap2.empty) {
                    setError('Perfil no encontrado');
                    return;
                }
                const doc2 = snap2.docs[0];
                setPersona({ id: doc2.id, ...doc2.data() } as Persona);
            } else {
                setPersona({ id: personaSnap.id, ...personaSnap.data() } as Persona);
            }
        } catch (e) {
            console.error('Error cargando perfil:', e);
            setError('Error al cargar el perfil');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const updatePersonalData = useCallback(
        async (data: Partial<Persona>) => {
            if (!persona) throw new Error('No hay perfil');
            const ref = doc(db, 'personas', persona.id);
            await updateDoc(ref, {
                ...data,
                updatedAt: serverTimestamp(),
            });
            await fetchProfile();
        },
        [persona, fetchProfile]
    );

    const changePassword = useCallback(
        async (currentPassword: string, newPassword: string) => {
            const user = auth.currentUser;
            if (!user || !user.email) throw new Error('No hay sesión');

            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPassword);
        },
        []
    );

    return {
        persona,
        isLoading,
        error,
        refresh: fetchProfile,
        updatePersonalData,
        changePassword,
    };
};
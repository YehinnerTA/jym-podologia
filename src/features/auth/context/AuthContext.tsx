import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    User
} from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../../config/firebase';

interface AuthContextType {
    user: User | null;
    role: string | null;
    subRol: string | null;
    personaId: string | null;
    sedesIds: string[];
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string, rememberMe: boolean) => Promise<boolean>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [subRol, setSubRol] = useState<string | null>(null);
    const [personaId, setPersonaId] = useState<string | null>(null);
    const [sedesIds, setSedesIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // 1. Leer documento de usuarios (rol/subRol/activo)
                const userDoc = await getDoc(doc(db, 'usuarios', firebaseUser.uid));

                if (!userDoc.exists()) {
                    await signOut(auth);
                    setUser(null);
                    setRole(null);
                    setSubRol(null);
                    setPersonaId(null);
                    setSedesIds([]);
                    setIsLoading(false);
                    return;
                }

                const userData = userDoc.data();

                // Si está inactivo, cerrar sesión
                if (userData.activo === false) {
                    await signOut(auth);
                    setUser(null);
                    setRole(null);
                    setSubRol(null);
                    setPersonaId(null);
                    setSedesIds([]);
                    setIsLoading(false);
                    return;
                }

                setUser(firebaseUser);
                setRole(userData.rol || null);
                setSubRol(userData.subRol || null);

                // 2. Buscar la persona por authUid
                const q = query(
                    collection(db, 'personas'),
                    where('authUid', '==', firebaseUser.uid)
                );
                const snap = await getDocs(q);

                if (!snap.empty) {
                    const personaDoc = snap.docs[0];
                    const personaData = personaDoc.data();
                    setPersonaId(personaDoc.id);
                    setSedesIds(personaData.sedesIds || []);
                } else {
                    setPersonaId(null);
                    setSedesIds([]);
                }
            } else {
                setUser(null);
                setRole(null);
                setSubRol(null);
                setPersonaId(null);
                setSedesIds([]);
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const login = async (email: string, password: string, rememberMe: boolean): Promise<boolean> => {
        try {
            await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
            await signInWithEmailAndPassword(auth, email, password);
            return true;
        } catch (error) {
            console.error('Error en login:', error);
            return false;
        }
    };

    const logout = async () => {
        await signOut(auth);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                role,
                subRol,
                personaId,
                sedesIds,
                isAuthenticated: !!user,
                isLoading,
                login,
                logout
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
    return context;
};
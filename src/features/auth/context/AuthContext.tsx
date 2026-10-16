import React, {
    createContext,
    useContext,
    useEffect,
    useState,
} from 'react';

import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    User,
} from 'firebase/auth';

import {
    doc,
    collection,
    query,
    where,
    limit,
    onSnapshot,
    Unsubscribe,
    DocumentData,
} from 'firebase/firestore';

import { auth, db } from '../../../config/firebase';

interface AuthContextType {
    user: User | null;
    role: string | null;
    subRol: string | null;
    personaId: string | null;
    sedesIds: string[];
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (
        email: string,
        password: string,
        rememberMe: boolean
    ) => Promise<boolean>;
    logout: () => Promise<void>;
}

interface SessionData {
    user: User;
    role: string;
    subRol: string | null;
    personaId: string | null;
    sedesIds: string[];
}

interface PersonaSession {
    id: string | null;
    data: DocumentData | null;
}

const VALID_ROLES = [
    'admin',
    'staff',
    'paciente',
];

const VALID_STAFF_SUBROLES = [
    'medico',
    'recepcion',
];

const AuthContext = createContext<
    AuthContextType | undefined
>(undefined);

const normalizarSedesIds = (
    value: unknown
): string[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    return [
        ...new Set(
            value.filter(
                (id): id is string =>
                    typeof id === 'string' &&
                    id.trim().length > 0
            )
        ),
    ];
};

export const AuthProvider: React.FC<{
    children: React.ReactNode;
}> = ({ children }) => {

    const [user, setUser] =
        useState<User | null>(null);

    const [role, setRole] =
        useState<string | null>(null);

    const [subRol, setSubRol] =
        useState<string | null>(null);

    const [personaId, setPersonaId] =
        useState<string | null>(null);

    const [sedesIds, setSedesIds] =
        useState<string[]>([]);

    const [isLoading, setIsLoading] =
        useState(true);

    useEffect(() => {
        let mounted = true;
        let requestId = 0;

        let unsubscribeUsuario: Unsubscribe | null = null;
        let unsubscribePersona: Unsubscribe | null = null;

        const clearSession = () => {
            if (!mounted) return;

            setUser(null);
            setRole(null);
            setSubRol(null);
            setPersonaId(null);
            setSedesIds([]);
        };

        const applySession = (session: SessionData) => {
            if (!mounted) return;

            setUser(session.user);
            setRole(session.role);
            setSubRol(session.subRol);
            setPersonaId(session.personaId);
            setSedesIds(session.sedesIds);
            setIsLoading(false);
        };

        const cancelarListeners = () => {
            if (unsubscribeUsuario) {
                unsubscribeUsuario();
                unsubscribeUsuario = null;
            }

            if (unsubscribePersona) {
                unsubscribePersona();
                unsubscribePersona = null;
            }
        };

        const unsubscribeAuth = onAuthStateChanged(
            auth,

            (firebaseUser) => {
                const currentRequest = ++requestId;

                cancelarListeners();
                clearSession();

                if (!mounted) return;

                if (!firebaseUser) {
                    setIsLoading(false);
                    return;
                }

                setIsLoading(true);

                let usuarioRecibido = false;
                let personaRecibida = false;

                let usuarioData: DocumentData | null = null;

                let personaSession: PersonaSession = {
                    id: null,
                    data: null,
                };

                let sesionInvalidada = false;

                const sesionVigente = (): boolean => {
                    return (
                        mounted &&
                        currentRequest === requestId &&
                        !sesionInvalidada
                    );
                };

                const invalidarSesion = (
                    motivo: string
                ) => {
                    if (!sesionVigente()) return;

                    sesionInvalidada = true;

                    console.error(
                        'Sesión no autorizada:',
                        motivo
                    );

                    cancelarListeners();
                    clearSession();

                    // No mantener el estado de carga
                    // bloqueado mientras se cierra sesión.
                    setIsLoading(false);

                    void signOut(auth).catch(
                        (error) => {
                            console.error(
                                'Error cerrando sesión inválida:',
                                error
                            );
                        }
                    );
                };

                const actualizarSesion = () => {
                    if (!sesionVigente()) return;

                    // Esperar los primeros resultados
                    // de ambas suscripciones.
                    if (
                        !usuarioRecibido ||
                        !personaRecibida
                    ) {
                        return;
                    }

                    if (!usuarioData) {
                        invalidarSesion(
                            'No existe el documento del usuario.'
                        );
                        return;
                    }

                    if (usuarioData.activo !== true) {
                        invalidarSesion(
                            'La cuenta del usuario está desactivada.'
                        );
                        return;
                    }

                    const userRole = usuarioData.rol;

                    if (
                        typeof userRole !== 'string' ||
                        !VALID_ROLES.includes(userRole)
                    ) {
                        invalidarSesion(
                            'El usuario no tiene un rol válido.'
                        );
                        return;
                    }

                    const userSubRol =
                        typeof usuarioData.subRol === 'string'
                            ? usuarioData.subRol
                            : null;

                    if (
                        userRole === 'staff' &&
                        (
                            !userSubRol ||
                            !VALID_STAFF_SUBROLES.includes(
                                userSubRol
                            )
                        )
                    ) {
                        invalidarSesion(
                            'El trabajador no tiene un subrol válido.'
                        );
                        return;
                    }

                    const personaData =
                        personaSession.data;

                    // Los trabajadores deben tener un
                    // perfil de persona vinculado.
                    if (
                        userRole === 'staff' &&
                        (
                            !personaSession.id ||
                            !personaData
                        )
                    ) {
                        invalidarSesion(
                            'El trabajador no tiene una persona vinculada.'
                        );
                        return;
                    }

                    if (
                        personaData &&
                        personaData.activo !== true
                    ) {
                        invalidarSesion(
                            'El perfil de la persona está desactivado.'
                        );
                        return;
                    }

                    const assignedSedesIds =
                        normalizarSedesIds(
                            personaData?.sedesIds
                        );

                    // ADMIN:
                    // CompanyContext autoriza todas
                    // las sedes activas según el rol.
                    //
                    // STAFF:
                    // CompanyContext utiliza las
                    // sedesIds asignadas a la persona.
                    applySession({
                        user: firebaseUser,
                        role: userRole,
                        subRol:
                            userRole === 'staff'
                                ? userSubRol
                                : null,
                        personaId:
                            personaSession.id,
                        sedesIds:
                            assignedSedesIds,
                    });
                };

                // Suscripción 1:
                // usuario de acceso.
                const usuarioRef = doc(
                    db,
                    'usuarios',
                    firebaseUser.uid
                );

                unsubscribeUsuario = onSnapshot(
                    usuarioRef,

                    (snapshot) => {
                        if (!sesionVigente()) return;

                        usuarioRecibido = true;

                        if (!snapshot.exists()) {
                            invalidarSesion(
                                'No se encontró usuarios/' +
                                firebaseUser.uid
                            );
                            return;
                        }

                        usuarioData = snapshot.data();

                        actualizarSesion();
                    },

                    (error) => {
                        if (!sesionVigente()) return;

                        console.error(
                            'Error observando usuario:',
                            error
                        );

                        invalidarSesion(
                            'No se pudo verificar la cuenta de acceso.'
                        );
                    }
                );

                // Suscripción 2:
                // persona vinculada al UID.
                const personasQuery = query(
                    collection(db, 'personas'),
                    where(
                        'authUid',
                        '==',
                        firebaseUser.uid
                    ),
                    limit(1)
                );

                unsubscribePersona = onSnapshot(
                    personasQuery,

                    (snapshot) => {
                        if (!sesionVigente()) return;

                        personaRecibida = true;

                        if (snapshot.empty) {
                            personaSession = {
                                id: null,
                                data: null,
                            };
                        } else {
                            const personaDoc =
                                snapshot.docs[0];

                            personaSession = {
                                id: personaDoc.id,
                                data: personaDoc.data(),
                            };
                        }

                        actualizarSesion();
                    },

                    (error) => {
                        if (!sesionVigente()) return;

                        console.error(
                            'Error observando persona:',
                            error
                        );

                        invalidarSesion(
                            'No se pudo verificar el perfil de la persona.'
                        );
                    }
                );
            },

            (error) => {
                console.error(
                    'Error observando Authentication:',
                    error
                );

                if (!mounted) return;

                requestId += 1;

                cancelarListeners();
                clearSession();
                setIsLoading(false);
            }
        );

        return () => {
            mounted = false;
            requestId += 1;

            cancelarListeners();
            unsubscribeAuth();
        };
    }, []);

    const login = async (
        email: string,
        password: string,
        rememberMe: boolean
    ): Promise<boolean> => {
        try {
            await setPersistence(
                auth,
                rememberMe
                    ? browserLocalPersistence
                    : browserSessionPersistence
            );

            await signInWithEmailAndPassword(
                auth,
                email.trim(),
                password
            );

            // onAuthStateChanged verifica la sesión.
            // Los listeners de Firestore mantienen
            // rol y sedes actualizados.
            return true;

        } catch (error) {
            console.error(
                'Error iniciando sesión:',
                error
            );

            return false;
        }
    };

    const logout = async (): Promise<void> => {
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
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error(
            'useAuth debe usarse dentro de AuthProvider'
        );
    }

    return context;
};
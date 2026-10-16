import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useMemo,
    ReactNode,
} from 'react';

import {
    collection,
    onSnapshot,
} from 'firebase/firestore';

import { db } from '../../../config/firebase';
import { useAuth } from '../../auth/context/AuthContext';
import { Sede } from '../../sedes/sede';

interface CompanyContextType {
    selectedSede: string | null;
    setSelectedSede: (sedeId: string) => void;

    // Sedes activas autorizadas para ingresar.
    sedes: Sede[];

    // Todas las sedes para el CRUD administrativo.
    sedesAdministrables: Sede[];

    isLoading: boolean;
    error: string | null;

    getSelectedSede: () => Sede | null;
}

const CompanyContext = createContext<
    CompanyContextType | undefined
>(undefined);

export const CompanyProvider: React.FC<{
    children: ReactNode;
}> = ({ children }) => {
    const {
        role,
        sedesIds,
        isAuthenticated,
        isLoading: authLoading,
    } = useAuth();

    const [todasLasSedes, setTodasLasSedes] =
        useState<Sede[]>([]);

    const [selectedSede, setSelectedSedeState] =
        useState<string | null>(
            () => localStorage.getItem('selectedSede')
        );

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const sedesIdsKey = useMemo(
        () => [...(sedesIds || [])].sort().join(','),
        [sedesIds]
    );

    // ÚNICA SUSCRIPCIÓN GLOBAL A LAS SEDES.
    useEffect(() => {
        if (authLoading) {
            setIsLoading(true);
            return;
        }

        if (!isAuthenticated) {
            setTodasLasSedes([]);
            setSelectedSedeState(null);
            setError(null);
            setIsLoading(false);
            localStorage.removeItem('selectedSede');
            return;
        }

        // Los roles inferiores requieren sedes asignadas.
        if (role !== 'admin' && !sedesIdsKey) {
            setTodasLasSedes([]);
            setSelectedSedeState(null);
            setError(null);
            setIsLoading(false);
            localStorage.removeItem('selectedSede');
            return;
        }

        let active = true;

        setIsLoading(true);
        setError(null);

        const unsubscribe = onSnapshot(
            collection(db, 'sedes'),

            (snapshot) => {
                if (!active) return;

                const nuevasSedes: Sede[] =
                    snapshot.docs.map((documento) => ({
                        ...documento.data(),
                        id: documento.id,
                    } as Sede));

                nuevasSedes.sort((a, b) =>
                    (a.nombre || '').localeCompare(
                        b.nombre || '',
                        'es'
                    )
                );

                // Actualiza a todos los consumidores
                // de useCompany() automáticamente.
                setTodasLasSedes(nuevasSedes);
                setError(null);
                setIsLoading(false);
            },

            (firebaseError) => {
                if (!active) return;

                console.error(
                    'Error sincronizando sedes:',
                    firebaseError
                );

                setTodasLasSedes([]);

                setError(
                    'No se pudieron sincronizar las sedes. ' +
                    'Verifica la conexión y los permisos de Firebase.'
                );

                setIsLoading(false);
            }
        );

        return () => {
            active = false;
            unsubscribe();
        };
    }, [
        authLoading,
        isAuthenticated,
        role,
        sedesIdsKey,
    ]);

    // El administrador ve todas las sedes activas.
    // Los demás roles solo ven sus sedes asignadas.
    const sedes = useMemo(() => {
        if (!isAuthenticated) return [];

        return todasLasSedes.filter((sede) => {
            if (sede.activo !== true) {
                return false;
            }

            if (role === 'admin') {
                return true;
            }

            return sedesIdsKey
                .split(',')
                .includes(sede.id);
        });
    }, [
        todasLasSedes,
        isAuthenticated,
        role,
        sedesIdsKey,
    ]);

    // Para el CRUD de administración se incluyen
    // sedes activas e inactivas.
    const sedesAdministrables = useMemo(() => {
        if (
            !isAuthenticated ||
            role !== 'admin'
        ) {
            return [];
        }

        return todasLasSedes;
    }, [
        todasLasSedes,
        isAuthenticated,
        role,
    ]);

    // Comprobar continuamente que la sede actual
    // siga siendo válida y esté activa.
    useEffect(() => {
        if (authLoading || isLoading) return;

        setSelectedSedeState((actual) => {
            if (error || sedes.length === 0) {
                return null;
            }

            if (
                actual &&
                sedes.some((sede) => sede.id === actual)
            ) {
                return actual;
            }

            const guardada =
                localStorage.getItem('selectedSede');

            if (
                guardada &&
                sedes.some((sede) => sede.id === guardada)
            ) {
                return guardada;
            }

            const predeterminada = sedes.find(
                (sede) => sede.esPredeterminada
            );

            return (
                predeterminada?.id ||
                sedes[0].id
            );
        });
    }, [
        authLoading,
        isLoading,
        sedes,
        error,
    ]);

    // Persistir la selección actual.
    useEffect(() => {
        if (authLoading || isLoading) return;

        if (selectedSede) {
            localStorage.setItem(
                'selectedSede',
                selectedSede
            );
        } else {
            localStorage.removeItem('selectedSede');
        }
    }, [
        selectedSede,
        authLoading,
        isLoading,
    ]);

    const setSelectedSede = (sedeId: string) => {
        const autorizada = sedes.some(
            (sede) => sede.id === sedeId
        );

        if (!autorizada) return;

        setSelectedSedeState(sedeId);
        localStorage.setItem(
            'selectedSede',
            sedeId
        );
    };

    const getSelectedSede = (): Sede | null => {
        return (
            sedes.find(
                (sede) => sede.id === selectedSede
            ) || null
        );
    };

    return (
        <CompanyContext.Provider
            value={{
                selectedSede,
                setSelectedSede,
                sedes,
                sedesAdministrables,
                isLoading,
                error,
                getSelectedSede,
            }}
        >
            {children}
        </CompanyContext.Provider>
    );
};

export const useCompany = (): CompanyContextType => {
    const context = useContext(CompanyContext);

    if (!context) {
        throw new Error(
            'useCompany debe usarse dentro de CompanyProvider'
        );
    }

    return context;
};
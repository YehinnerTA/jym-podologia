import {
    useState,
    useEffect,
    useMemo,
} from 'react';

import { useCompany } from '../../company/context/CompanyContext';
import { useAuth } from '../../auth/context/AuthContext';

export type SedeEstadoFilter =
    | 'todas'
    | 'activas'
    | 'inactivas';

export const useSedes = () => {
    const {
        sedesAdministrables,
        isLoading: companyLoading,
        error: companyError,
    } = useCompany();

    const {
        role,
        isAuthenticated,
        isLoading: authLoading,
    } = useAuth();

    const [search, setSearch] = useState('');

    const [estadoFilter, setEstadoFilter] =
        useState<SedeEstadoFilter>('activas');

    const [currentPage, setCurrentPage] = useState(1);

    const itemsPerPage = 20;

    const isLoading =
        authLoading || companyLoading;

    const autorizado =
        isAuthenticated && role === 'admin';

    // Se consumen directamente los datos compartidos.
    // No hay una segunda lista desactualizada.
    const sedes = useMemo(() => {
        if (!autorizado) return [];

        return sedesAdministrables;
    }, [
        autorizado,
        sedesAdministrables,
    ]);

    const filtered = useMemo(() => {
        let result = [...sedes];

        if (estadoFilter === 'activas') {
            result = result.filter(
                (sede) => sede.activo === true
            );
        } else if (estadoFilter === 'inactivas') {
            result = result.filter(
                (sede) => sede.activo !== true
            );
        }

        const q = search.trim().toLowerCase();

        if (q) {
            result = result.filter(
                (sede) =>
                    (sede.nombre || '')
                        .toLowerCase()
                        .includes(q) ||
                    (sede.direccion || '')
                        .toLowerCase()
                        .includes(q)
            );
        }

        return result;
    }, [
        sedes,
        search,
        estadoFilter,
    ]);

    const totalPages =
        Math.ceil(filtered.length / itemsPerPage) || 1;

    const paginated = useMemo(() => {
        const start =
            (currentPage - 1) * itemsPerPage;

        return filtered.slice(
            start,
            start + itemsPerPage
        );
    }, [
        filtered,
        currentPage,
    ]);

    useEffect(() => {
        setCurrentPage(1);
    }, [
        search,
        estadoFilter,
    ]);

    // Mantener la página dentro de los límites
    // cuando se agregan o eliminan registros.
    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [
        currentPage,
        totalPages,
    ]);

    // Compatibilidad con SedeList.tsx.
    // Ya no necesitamos llamar getDocs():
    // CompanyContext recibe los cambios automáticamente.
    const refresh = async (): Promise<void> => {
        return;
    };

    return {
        sedes: paginated,
        totalSedes: filtered.length,

        isLoading,
        error: companyError || '',

        search,
        setSearch,

        estadoFilter,
        setEstadoFilter,

        currentPage,
        totalPages,
        itemsPerPage,
        setCurrentPage,

        refresh,
    };
};
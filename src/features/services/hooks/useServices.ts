import {
    useState,
    useEffect,
    useMemo,
    useCallback,
} from 'react';

import {
    collection,
    onSnapshot,
    query,
    orderBy,
} from 'firebase/firestore';

import { db } from '../../../config/firebase';
import { useAuth } from '../../auth/context/AuthContext';

import { Servicio } from '../service';

export type ServicioEstadoFiltro =
    | 'todos'
    | 'activos'
    | 'inactivos';

interface ServiceFilters {
    search: string;
    estadoFilter: ServicioEstadoFiltro;
    sedeFilter: string;
    categoriaFilter: string;
}

export const useServices = (filters: ServiceFilters) => {
    const {
        role,
        isAuthenticated,
        isLoading: authLoading,
    } = useAuth();

    const [servicios, setServicios] =
        useState<Servicio[]>([]);

    const [isLoading, setIsLoading] =
        useState(true);

    const [error, setError] =
        useState('');

    const [currentPage, setCurrentPage] =
        useState(1);

    const itemsPerPage = 20;

    useEffect(() => {
        if (authLoading) {
            setIsLoading(true);
            return;
        }

        if (
            !isAuthenticated ||
            role !== 'admin'
        ) {
            setServicios([]);
            setError('');
            setIsLoading(false);
            return;
        }

        let active = true;

        setIsLoading(true);
        setError('');

        const serviciosQuery = query(
            collection(db, 'servicios'),
            orderBy('nombre', 'asc')
        );

        const unsubscribe = onSnapshot(
            serviciosQuery,

            (snapshot) => {
                if (!active) return;

                const registros: Servicio[] =
                    snapshot.docs.map((documento) => ({
                        ...documento.data(),
                        id: documento.id,
                    } as Servicio));

                setServicios(registros);

                setError('');
                setIsLoading(false);
            },

            (firebaseError) => {
                if (!active) return;

                console.error(
                    'Error sincronizando servicios:',
                    firebaseError
                );

                setServicios([]);

                setError(
                    'No se pudieron sincronizar los servicios. ' +
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
    ]);

    const filtered = useMemo(() => {
        let result = [...servicios];

        if (filters.estadoFilter === 'activos') {
            result = result.filter(
                (servicio) => servicio.activo === true
            );
        } else if (
            filters.estadoFilter === 'inactivos'
        ) {
            result = result.filter(
                (servicio) => servicio.activo !== true
            );
        }

        if (filters.sedeFilter) {
            result = result.filter(
                (servicio) =>
                    Array.isArray(servicio.sedesIds) &&
                    servicio.sedesIds.includes(
                        filters.sedeFilter
                    )
            );
        }

        if (filters.categoriaFilter) {
            result = result.filter(
                (servicio) =>
                    servicio.categoria ===
                    filters.categoriaFilter
            );
        }

        const term = filters.search
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

        if (term) {
            result = result.filter((servicio) => {
                const text = `${servicio.nombre || ''
                    } ${servicio.descripcion || ''
                    }`
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '');

                return text.includes(term);
            });
        }

        return result.sort((a, b) =>
            (a.nombre || '').localeCompare(
                b.nombre || '',
                'es'
            )
        );
    }, [
        servicios,
        filters.search,
        filters.estadoFilter,
        filters.sedeFilter,
        filters.categoriaFilter,
    ]);

    const totalPages =
        Math.ceil(
            filtered.length / itemsPerPage
        ) || 1;

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
        filters.search,
        filters.estadoFilter,
        filters.sedeFilter,
        filters.categoriaFilter,
    ]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [
        currentPage,
        totalPages,
    ]);

    const refresh = useCallback(
        async (): Promise<void> => {
            return;
        },
        []
    );

    return {
        servicios: paginated,
        totalServicios: filtered.length,

        isLoading,
        error,

        currentPage,
        totalPages,
        itemsPerPage,
        setCurrentPage,

        refresh,
    };
};
import {
    useState,
    useEffect,
    useCallback,
    useMemo,
} from 'react';

import {
    collection,
    onSnapshot,
    query,
    where,
} from 'firebase/firestore';

import { db } from '../../../config/firebase';

import { Cita } from '../appointment';

import { useAuth } from '../../auth/context/AuthContext';
import { useCompany } from '../../company/context/CompanyContext';

import {
    getFechaInicioDia,
    getFechaFinDia,
    getRangoSemana,
    getRangoMes,
} from '../utils/appointmentHelpers';

import {
    FechaRango,
    EstadoFiltro,
} from './useAppointmentFilters';

interface Filters {
    search: string;
    estadoFilter: EstadoFiltro;
    fechaRango: FechaRango;
    medicoFilter: string;
    servicioFilter: string;
}

export const useAppointments = (filters: Filters) => {
    const {
        role,
        isAuthenticated,
        isLoading: authLoading,
    } = useAuth();

    const {
        selectedSede,
        sedes,
        isLoading: sedesLoading,
    } = useCompany();

    const [citas, setCitas] =
        useState<Cita[]>([]);

    const [isLoading, setIsLoading] =
        useState(true);

    const [error, setError] =
        useState('');

    const [currentPage, setCurrentPage] =
        useState(1);

    const itemsPerPage = 20;

    const tieneRolAutorizado =
        role === 'admin' ||
        role === 'staff';

    const sedeAutorizada = useMemo(() => {
        if (!selectedSede) {
            return false;
        }

        return sedes.some(
            (sede) =>
                sede.id === selectedSede &&
                sede.activo === true
        );
    }, [sedes, selectedSede]);

    useEffect(() => {
        if (authLoading || sedesLoading) {
            setIsLoading(true);
            return;
        }

        if (
            !isAuthenticated ||
            !tieneRolAutorizado ||
            !selectedSede ||
            !sedeAutorizada
        ) {
            setCitas([]);
            setError('');
            setIsLoading(false);
            return;
        }

        let active = true;

        setIsLoading(true);
        setError('');
        setCitas([]);

        const citasQuery = query(
            collection(db, 'citas'),
            where(
                'sedeId',
                '==',
                selectedSede
            )
        );

        const unsubscribe = onSnapshot(
            citasQuery,

            (snapshot) => {
                if (!active) return;

                const registros: Cita[] =
                    snapshot.docs.map(
                        (documento) => ({
                            ...documento.data(),
                            id: documento.id,
                        } as Cita)
                    );

                setCitas(registros);
                setError('');
                setIsLoading(false);
            },

            (firebaseError) => {
                if (!active) return;

                console.error(
                    'Error sincronizando citas:',
                    firebaseError
                );

                setCitas([]);

                setError(
                    'No se pudieron sincronizar las citas. ' +
                    'Verifica tu conexión y los permisos de Firestore.'
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
        sedesLoading,
        isAuthenticated,
        tieneRolAutorizado,
        selectedSede,
        sedeAutorizada,
    ]);

    const filtered = useMemo(() => {
        let result = [...citas];

        let rangoInicio: Date | null = null;
        let rangoFin: Date | null = null;

        if (filters.fechaRango === 'hoy') {
            rangoInicio = getFechaInicioDia();
            rangoFin = getFechaFinDia();
        } else if (filters.fechaRango === 'semana') {
            const { inicio, fin } = getRangoSemana();

            rangoInicio = inicio;
            rangoFin = fin;
        } else if (filters.fechaRango === 'mes') {
            const { inicio, fin } = getRangoMes();

            rangoInicio = inicio;
            rangoFin = fin;
        }

        if (rangoInicio && rangoFin) {
            const inicio = rangoInicio;
            const fin = rangoFin;

            result = result.filter((cita) => {
                const fecha = new Date(
                    cita.fechaInicio
                );

                return (
                    !Number.isNaN(fecha.getTime()) &&
                    fecha >= inicio &&
                    fecha <= fin
                );
            });
        }

        if (filters.estadoFilter !== 'todos') {
            result = result.filter(
                (cita) =>
                    cita.estado ===
                    filters.estadoFilter
            );
        }

        if (filters.medicoFilter) {
            result = result.filter(
                (cita) =>
                    cita.medicoId ===
                    filters.medicoFilter
            );
        }

        if (filters.servicioFilter) {
            result = result.filter(
                (cita) =>
                    cita.servicioId ===
                    filters.servicioFilter
            );
        }

        const q = filters.search
            .trim()
            .toLowerCase();

        if (q) {
            result = result.filter(
                (cita) =>
                    (cita.pacienteNombre || '')
                        .toLowerCase()
                        .includes(q) ||
                    (cita.pacienteWhatsapp || '')
                        .toLowerCase()
                        .includes(q) ||
                    (cita.pacienteDni || '')
                        .toLowerCase()
                        .includes(q)
            );
        }

        return result.sort(
            (a, b) =>
                new Date(a.fechaInicio).getTime() -
                new Date(b.fechaInicio).getTime()
        );
    }, [
        citas,
        filters.search,
        filters.estadoFilter,
        filters.fechaRango,
        filters.medicoFilter,
        filters.servicioFilter,
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
        filters.fechaRango,
        filters.medicoFilter,
        filters.servicioFilter,
        selectedSede,
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
        citas: paginated,
        totalCitas: filtered.length,

        isLoading,
        error,

        currentPage,
        totalPages,
        itemsPerPage,
        setCurrentPage,

        refresh,
    };
};
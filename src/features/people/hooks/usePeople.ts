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
    where,
} from 'firebase/firestore';

import { db } from '../../../config/firebase';
import { Persona, PersonaTipo } from '../person';

import { useAuth } from '../../auth/context/AuthContext';
import { useCompany } from '../../company/context/CompanyContext';

export type TipoFilter = 'todas' | PersonaTipo;

export type EstadoFilter =
    | 'todos'
    | 'activos'
    | 'inactivos';

export const usePeople = () => {
    const {
        role,
        isAuthenticated,
        isLoading: authLoading,
    } = useAuth();

    const {
        selectedSede,
    } = useCompany();

    const [personas, setPersonas] =
        useState<Persona[]>([]);

    const [isLoading, setIsLoading] =
        useState(true);

    const [error, setError] =
        useState('');

    const [search, setSearch] =
        useState('');

    const [tipoFilter, setTipoFilter] =
        useState<TipoFilter>('paciente');

    const [estadoFilter, setEstadoFilter] =
        useState<EstadoFilter>('activos');

    const [currentPage, setCurrentPage] =
        useState(1);

    const itemsPerPage = 20;

    const isAdmin = role === 'admin';
    const isStaff = role === 'staff';

    // Admin: consulta global de todas las personas.
    useEffect(() => {
        if (authLoading) {
            setIsLoading(true);
            return;
        }

        if (!isAuthenticated || !isAdmin) {
            if (!isStaff) {
                setPersonas([]);
                setError('');
                setIsLoading(false);
            }
            return;
        }

        let active = true;

        setIsLoading(true);
        setError('');
        setPersonas([]);

        const unsubscribe = onSnapshot(
            query(collection(db, 'personas')),
            (snapshot) => {
                if (!active) return;

                const registros = snapshot.docs.map(
                    (documento) => ({
                        ...documento.data(),
                        id: documento.id,
                    } as Persona)
                );

                setPersonas(registros);
                setError('');
                setIsLoading(false);
            },
            (firebaseError) => {
                if (!active) return;

                console.error(
                    'Error sincronizando personas:',
                    firebaseError
                );

                setPersonas([]);
                setError(
                    'No se pudieron sincronizar las personas.'
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
        isAdmin,
        isStaff,
    ]);

    // STAFF:
    // Pacientes globales o médicos de la sede
    // según el filtro seleccionado.
    useEffect(() => {
        if (authLoading || !isStaff) {
            return;
        }

        if (!isAuthenticated) {
            setPersonas([]);
            setError('');
            setIsLoading(false);
            return;
        }

        const mostrarMedicos =
            tipoFilter === 'medico';

        if (mostrarMedicos && !selectedSede) {
            setPersonas([]);
            setError('');
            setIsLoading(false);
            return;
        }

        let active = true;

        setIsLoading(true);
        setError('');
        setPersonas([]);

        const personasCollection =
            collection(db, 'personas');

        const consulta = mostrarMedicos
            ? query(
                personasCollection,
                where('tipo', '==', 'medico'),
                where('activo', '==', true),
                where(
                    'sedesIds',
                    'array-contains',
                    selectedSede
                )
            )
            : query(
                personasCollection,
                where('tipo', '==', 'paciente')
            );

        const unsubscribe = onSnapshot(
            consulta,
            (snapshot) => {
                if (!active) return;

                const registros = snapshot.docs.map(
                    (documento) => ({
                        ...documento.data(),
                        id: documento.id,
                    } as Persona)
                );

                const permitidos = mostrarMedicos
                    ? registros.filter(
                        (persona) =>
                            persona.tipo === 'medico' &&
                            persona.esTrabajador === true &&
                            persona.activo === true &&
                            selectedSede !== null &&
                            persona.sedesIds?.includes(selectedSede)
                    )
                    : registros.filter(
                        (persona) =>
                            persona.tipo === 'paciente' &&
                            persona.esTrabajador !== true &&
                            !persona.authUid
                    );

                setPersonas(permitidos);
                setError('');
                setIsLoading(false);
            },
            (firebaseError) => {
                if (!active) return;

                console.error(
                    'Error sincronizando personas:',
                    firebaseError
                );

                setPersonas([]);
                setError(
                    firebaseError.code === 'permission-denied'
                        ? 'No tienes permisos para consultar estos registros.'
                        : 'No se pudieron sincronizar las personas.'
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
        isStaff,
        tipoFilter,
        selectedSede,
    ]);

    // Aplicar filtros a los registros recibidos.
    const filtered = useMemo(() => {
        let result = [...personas];

        if (isStaff) {
            if (tipoFilter === 'medico') {
                result = result.filter(
                    (persona) =>
                        persona.tipo === 'medico' &&
                        persona.esTrabajador === true &&
                        persona.activo === true &&
                        selectedSede !== null &&
                        persona.sedesIds?.includes(selectedSede)
                );
            } else {
                result = result.filter(
                    (persona) =>
                        persona.tipo === 'paciente' &&
                        persona.esTrabajador !== true &&
                        !persona.authUid
                );
            }
        } else if (tipoFilter !== 'todas') {
            result = result.filter(
                (persona) =>
                    persona.tipo === tipoFilter
            );
        }

        if (estadoFilter === 'activos') {
            result = result.filter(
                (persona) => persona.activo === true
            );
        } else if (estadoFilter === 'inactivos') {
            result = result.filter(
                (persona) => persona.activo !== true
            );
        }

        const q = search
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

        if (q) {
            result = result.filter((persona) => {
                const nombre = (persona.nombre || '')
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '');

                return (
                    nombre.includes(q) ||
                    (
                        persona.tipo === 'paciente' &&
                        (
                            (persona.dni || '').includes(q) ||
                            (persona.whatsapp || '').includes(q)
                        )
                    ) ||
                    (
                        persona.tipo === 'medico' &&
                        (persona.especialidad || '')
                            .toLowerCase()
                            .includes(q)
                    )
                );
            });
        }

        return result.sort((a, b) =>
            (a.nombre || '').localeCompare(
                b.nombre || '',
                'es'
            )
        );
    }, [
        personas,
        isAdmin,
        isStaff,
        tipoFilter,
        estadoFilter,
        search,
        selectedSede,
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

    // Al cambiar de rol, restablecer
    // el filtro correspondiente.
    useEffect(() => {
        setTipoFilter(
            role === 'admin' ? 'todas' : 'paciente'
        );
    }, [role]);

    useEffect(() => {
        setCurrentPage(1);
    }, [
        search,
        tipoFilter,
        estadoFilter,
        selectedSede,
        role,
    ]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [
        currentPage,
        totalPages,
    ]);

    // Conservado por compatibilidad.
    const refresh = useCallback(
        async (): Promise<void> => { },
        []
    );

    return {
        personas: paginated,
        totalPersonas: filtered.length,

        isLoading,
        error,

        search,
        setSearch,

        tipoFilter,
        setTipoFilter,

        estadoFilter,
        setEstadoFilter,

        currentPage,
        totalPages,
        itemsPerPage,
        setCurrentPage,

        refresh,
    };
};
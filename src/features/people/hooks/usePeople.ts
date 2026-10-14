import { useState, useEffect, useCallback, useMemo } from 'react';
import { personService } from '../services/personService';
import { Persona, PersonaTipo } from '../person';

export type TipoFilter = 'todas' | PersonaTipo;
export type EstadoFilter = 'todos' | 'activos' | 'inactivos';

export const usePeople = () => {
    const [personas, setPersonas] = useState<Persona[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [tipoFilter, setTipoFilter] = useState<TipoFilter>('todas');
    const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>('activos');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    const fetchPersonas = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await personService.getAll();
            setPersonas(data);
        } catch (error) {
            console.error('Error cargando personas:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPersonas();
    }, [fetchPersonas]);

    const filtered = useMemo(() => {
        let result = [...personas];

        if (tipoFilter !== 'todas') {
            result = result.filter((p) => p.tipo === tipoFilter);
        }

        if (estadoFilter === 'activos') result = result.filter((p) => p.activo);
        if (estadoFilter === 'inactivos') result = result.filter((p) => !p.activo);

        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(
                (p) =>
                    p.nombre.toLowerCase().includes(q) ||
                    p.dni.includes(q) ||
                    p.whatsapp.includes(q)
            );
        }

        return result;
    }, [personas, search, tipoFilter, estadoFilter]);

    const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
    const paginated = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filtered.slice(start, start + itemsPerPage);
    }, [filtered, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [search, tipoFilter, estadoFilter]);

    return {
        personas: paginated,
        totalPersonas: filtered.length,
        isLoading,
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
        refresh: fetchPersonas,
    };
};
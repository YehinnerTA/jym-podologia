import { useState, useEffect, useCallback, useMemo } from 'react';
import { sedeService } from '../services/sedeService';
import { Sede } from '../sede';

export type SedeEstadoFilter = 'todas' | 'activas' | 'inactivas';

export const useSedes = () => {
    const [sedes, setSedes] = useState<Sede[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [estadoFilter, setEstadoFilter] = useState<SedeEstadoFilter>('activas');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    const fetchSedes = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await sedeService.getAll();
            setSedes(data);
        } catch (error) {
            console.error('Error cargando sedes:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSedes();
    }, [fetchSedes]);

    const filtered = useMemo(() => {
        let result = [...sedes];

        if (estadoFilter === 'activas') {
            result = result.filter((s) => s.activo);
        } else if (estadoFilter === 'inactivas') {
            result = result.filter((s) => !s.activo);
        }

        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(
                (s) =>
                    s.nombre.toLowerCase().includes(q) ||
                    s.ruc.includes(q) ||
                    s.direccion.toLowerCase().includes(q)
            );
        }

        return result;
    }, [sedes, search, estadoFilter]);

    const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
    const paginated = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filtered.slice(start, start + itemsPerPage);
    }, [filtered, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [search, estadoFilter]);

    return {
        sedes: paginated,
        totalSedes: filtered.length,
        isLoading,
        search,
        setSearch,
        estadoFilter,
        setEstadoFilter,
        currentPage,
        totalPages,
        itemsPerPage,
        setCurrentPage,
        refresh: fetchSedes,
    };
};
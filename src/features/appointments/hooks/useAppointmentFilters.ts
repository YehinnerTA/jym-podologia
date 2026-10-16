import { useState, useCallback } from 'react';
import { CitaEstado } from '../appointment';

export type FechaRango = 'hoy' | 'semana' | 'mes' | 'todas';
export type EstadoFiltro = 'todos' | CitaEstado;

export const useAppointmentFilters = () => {
    const [search, setSearch] = useState('');
    const [estadoFilter, setEstadoFilter] = useState<EstadoFiltro>('todos');
    const [fechaRango, setFechaRango] = useState<FechaRango>('hoy');
    const [medicoFilter, setMedicoFilter] = useState('');
    const [servicioFilter, setServicioFilter] = useState('');

    const clearFilters = useCallback(() => {
        setSearch('');
        setEstadoFilter('todos');
        setFechaRango('hoy');
        setMedicoFilter('');
        setServicioFilter('');
    }, []);

    const hasActiveFilters = Boolean(
        search || estadoFilter !== 'todos' || fechaRango !== 'hoy' || medicoFilter || servicioFilter
    );

    return {
        search,
        setSearch,
        estadoFilter,
        setEstadoFilter,
        fechaRango,
        setFechaRango,
        medicoFilter,
        setMedicoFilter,
        servicioFilter,
        setServicioFilter,
        clearFilters,
        hasActiveFilters,
    };
};
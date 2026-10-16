import React from 'react';
import { AppSearchInput, AppSelect, AppCard } from '../../../components';
import { FechaRango, EstadoFiltro } from '../hooks/useAppointmentFilters';
import { CITA_ESTADO_LABELS, CitaEstado } from '../appointment';

interface Props {
    search: string;
    setSearch: (v: string) => void;
    estadoFilter: EstadoFiltro;
    setEstadoFilter: (v: EstadoFiltro) => void;
    fechaRango: FechaRango;
    setFechaRango: (v: FechaRango) => void;
    medicoFilter: string;
    setMedicoFilter: (v: string) => void;
    servicioFilter: string;
    setServicioFilter: (v: string) => void;
    medicos: { id: string; nombre: string }[];
    servicios: { id: string; nombre: string }[];
}

export const AppointmentFilters: React.FC<Props> = ({
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
    medicos,
    servicios,
}) => {
    const estados: { value: EstadoFiltro; label: string }[] = [
        { value: 'todos', label: 'Todos los estados' },
        ...(Object.keys(CITA_ESTADO_LABELS) as CitaEstado[]).map((e) => ({
            value: e,
            label: CITA_ESTADO_LABELS[e],
        })),
    ];

    const fechas: { value: FechaRango; label: string }[] = [
        { value: 'hoy', label: 'Hoy' },
        { value: 'semana', label: 'Esta semana' },
        { value: 'mes', label: 'Este mes' },
        { value: 'todas', label: 'Todas' },
    ];

    return (
        <AppCard padding="md" className="cita-filters-card">
            <div className="cita-filters">
                <div className="cita-filters-search">
                    <AppSearchInput
                        value={search}
                        onChange={setSearch}
                        placeholder="Buscar por paciente, DNI o WhatsApp..."
                    />
                </div>

                <AppSelect
                    value={fechaRango}
                    onChange={(v) => setFechaRango(v as FechaRango)}
                    options={fechas}
                    placeholder="Fecha"
                />

                <AppSelect
                    value={estadoFilter}
                    onChange={(v) => setEstadoFilter(v as EstadoFiltro)}
                    options={estados}
                    placeholder="Estado"
                />

                <AppSelect
                    value={medicoFilter}
                    onChange={setMedicoFilter}
                    options={[
                        { value: '', label: 'Todos los médicos' },
                        ...medicos.map((m) => ({ value: m.id, label: m.nombre })),
                    ]}
                    placeholder="Médico"
                />

                <AppSelect
                    value={servicioFilter}
                    onChange={setServicioFilter}
                    options={[
                        { value: '', label: 'Todos los servicios' },
                        ...servicios.map((s) => ({ value: s.id, label: s.nombre })),
                    ]}
                    placeholder="Servicio"
                />
            </div>
        </AppCard>
    );
};
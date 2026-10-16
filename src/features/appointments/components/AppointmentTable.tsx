import React, { useEffect, useState } from 'react';
import { AppTable, AppTableColumn } from '../../../components';
import { Cita } from '../appointment';
import { AppointmentStatusBadge } from './AppointmentStatusBadge';
import { formatRango, formatFechaHora } from '../utils/appointmentHelpers';
import { appointmentService } from '../services/appointmentService';

interface Props {
    citas: Cita[];
    loading?: boolean;
    ahora?: number;
    onView: (c: Cita) => void;
    onEdit: (c: Cita) => void;
    onCancel: (c: Cita) => void;
}

export const AppointmentTable: React.FC<Props> = ({
    citas,
    loading,
    ahora = Date.now(),
    onView,
    onEdit,
    onCancel,
}) => {
    const [vigentes, setVigentes] = useState<Record<string, Cita>>({});

    useEffect(() => {
        let activo = true;
        setVigentes({});

        const obtenerUltima = async (inicial: Cita): Promise<Cita> => {
            let actual = inicial;
            const visitados = new Set<string>([inicial.id]);

            for (let paso = 0; paso < 30 && actual.reprogramadaHacia; paso++) {
                const siguienteId = actual.reprogramadaHacia;
                if (visitados.has(siguienteId)) break;
                visitados.add(siguienteId);
                const siguiente = await appointmentService.getById(siguienteId);
                if (!siguiente) break;
                actual = siguiente;
            }
            return actual;
        };

        void Promise.all(citas.map(async (cita) => {
            if (!cita.reprogramadaHacia) return;
            try {
                const ultima = await obtenerUltima(cita);
                if (activo) {
                    setVigentes(prev => ({ ...prev, [cita.id]: ultima }));
                }
            } catch (error) {
                console.error('No se pudo consultar la última franja reagendada:', error);
            }
        }));

        return () => { activo = false; };
    }, [citas]);

    const fechaMostrada = (cita: Cita): Cita => vigentes[cita.id] || cita;

    const vencidaSinGestionar = (cita: Cita): boolean => {
        if (cita.estado !== 'pendiente_atencion') return false;
        const inicio = new Date(cita.fechaInicio);
        if (!Number.isFinite(inicio.getTime())) return false;
        const siguienteDia = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 1);
        return ahora >= siguienteDia.getTime();
    };

    const columns: AppTableColumn<Cita>[] = [
        {
            key: 'fecha',
            header: 'Fecha programada',
            width: '190px',
            render: (c) => {
                const vigente = fechaMostrada(c);
                const distinta = vigente.id !== c.id;
                return (
                    <div>
                        <div className="cita-paciente-nombre">
                            {formatFechaHora(vigente.fechaInicio)}
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'hora',
            header: 'Horario',
            width: '155px',
            render: (c) => {
                const vigente = fechaMostrada(c);
                return (
                    <div>
                        <span className="cita-hora">
                            {formatRango(vigente.fechaInicio, vigente.fechaFin)}
                        </span>
                    </div>
                );
            },
        },
        {
            key: 'paciente',
            header: 'Paciente',
            render: (c) => (
                <div>
                    <div className="cita-paciente-nombre">{c.pacienteNombre}</div>
                    <div className="cita-paciente-dni">DNI: {c.pacienteDni}</div>
                </div>
            ),
        },
        {
            key: 'servicio',
            header: 'Servicio',
            render: (c) => (
                <div>
                    <div>{c.servicioNombre}</div>
                    <div className="cita-duracion">{c.duracionMin} min</div>
                </div>
            ),
        },
        {
            key: 'medico',
            header: 'Médico',
            render: (c) => <span>{c.medicoNombre || '—'}</span>,
        },
        {
            key: 'estado',
            header: 'Estado',
            render: (c) => (
                <div>
                    {vencidaSinGestionar(fechaMostrada(c)) ? (
                        <span className="cita-status-badge" style={{ color: '#9a5b08', borderColor: '#f5c36b', background: '#fffbeb' }}
                            title="Pasó su fecha y no hay atención ni inasistencia registrada">
                            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                            Vencida sin gestionar
                        </span>
                    ) : <AppointmentStatusBadge estado={fechaMostrada(c).estado} />}
                </div>
            ),
        },
        {
            key: 'acciones',
            header: 'Acciones',
            align: 'right',
            width: '140px',
            render: (c) => (
                <div className="cita-actions">
                    <button type="button" className="cita-action-btn"
                        onClick={(e) => { e.stopPropagation(); onView(c); }} aria-label="Ver detalle">
                        <i className="fa-solid fa-eye"></i>
                    </button>
                    <button type="button" className="cita-action-btn"
                        onClick={(e) => { e.stopPropagation(); onEdit(c); }} aria-label="Editar">
                        <i className="fa-solid fa-pen"></i>
                    </button>
                    <button type="button" className="cita-action-btn danger"
                        onClick={(e) => { e.stopPropagation(); onCancel(c); }} aria-label="Cancelar">
                        <i className="fa-solid fa-ban"></i>
                    </button>
                </div>
            ),
        },
    ];

    return (
        <AppTable<Cita>
            columns={columns}
            data={citas}
            rowKey={(c) => c.id}
            loading={loading}
            emptyMessage="No hay citas para mostrar"
        />
    );
};
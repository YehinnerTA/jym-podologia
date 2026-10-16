import React from 'react';
import {
    AppModal,
    AppButton,
} from '../../../components';

import {
    Sede,
    DiaSemana,
    HorarioDia,
} from '../sede';

import { DIAS_LABELS } from '../utils/sedeHelpers';
import { useAuth } from '../../auth/context/AuthContext';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    sede: Sede | null;
    onEdit: (sede: Sede) => void;
}

export const SedeDetail: React.FC<Props> = ({
    isOpen,
    onClose,
    sede,
    onEdit,
}) => {
    const { role } = useAuth();

    if (!sede) return null;

    const diasActivos = Object.entries(
        sede.horarioAtencion || {}
    ).filter(
        (entry): entry is [string, HorarioDia] =>
            entry[1] !== null &&
            typeof entry[1] === 'object' &&
            typeof entry[1].inicio === 'string' &&
            typeof entry[1].fin === 'string'
    );

    return (
        <AppModal
            isOpen={isOpen}
            onClose={onClose}
            title="Detalle de Sede"
            icon="fa-solid fa-hospital"
            size="md"
            footer={
                <>
                    <AppButton
                        variant="ghost"
                        onClick={onClose}
                    >
                        Cerrar
                    </AppButton>

                    {role === 'admin' && (
                        <AppButton
                            variant="primary"
                            icon="fa-solid fa-pen"
                            iconPosition="left"
                            onClick={() => onEdit(sede)}
                        >
                            Editar
                        </AppButton>
                    )}
                </>
            }
        >
            <div className="sede-detail">
                <div className="sede-detail-header">
                    <h2>{sede.nombre}</h2>

                    <span
                        className={`sede-detail-status ${sede.activo
                            ? 'activa'
                            : 'inactiva'
                            }`}
                    >
                        {sede.activo
                            ? 'Activa'
                            : 'Inactiva'}
                    </span>

                    {sede.esPredeterminada && (
                        <span className="sede-detail-badge-pred">
                            <i className="fa-solid fa-star"></i>
                            {' '}Predeterminada
                        </span>
                    )}
                </div>

                <div className="sede-detail-grid">
                    <div className="sede-detail-item">
                        <span className="sede-detail-label">
                            Teléfono
                        </span>

                        <span className="sede-detail-value">
                            {sede.telefono || '—'}
                        </span>
                    </div>

                    <div className="sede-detail-item">
                        <span className="sede-detail-label">
                            Email
                        </span>

                        <span className="sede-detail-value">
                            {sede.email || '—'}
                        </span>
                    </div>

                    <div className="sede-detail-item full">
                        <span className="sede-detail-label">
                            Dirección
                        </span>

                        <span className="sede-detail-value">
                            {sede.direccion || '—'}
                        </span>
                    </div>

                    <div className="sede-detail-item">
                        <span className="sede-detail-label">
                            Cupos por horario
                        </span>

                        <span className="sede-detail-value">
                            {sede.cuposPorHorario ?? '—'}
                        </span>
                    </div>

                    <div className="sede-detail-item">
                        <span className="sede-detail-label">
                            Habitaciones
                        </span>

                        <span className="sede-detail-value">
                            {sede.habitaciones ?? '—'}
                        </span>
                    </div>
                </div>

                <div className="sede-detail-section">
                    <h3>Horario de atención</h3>

                    <ul className="sede-detail-horarios">
                        {diasActivos.length === 0 ? (
                            <li className="sede-detail-sin-horario">
                                Sin horario configurado
                            </li>
                        ) : (
                            diasActivos.map(([dia, horario]) => (
                                <li key={dia}>
                                    <span className="sede-detail-dia">
                                        {DIAS_LABELS[
                                            dia as DiaSemana
                                        ] || dia}
                                    </span>

                                    <span className="sede-detail-hora">
                                        {horario.inicio}
                                        {' – '}
                                        {horario.fin}
                                    </span>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            </div>
        </AppModal>
    );
};
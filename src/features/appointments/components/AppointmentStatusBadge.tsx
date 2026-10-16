import React from 'react';
import { CitaEstado, CITA_ESTADO_LABELS, CITA_ESTADO_ICONS, CITA_ESTADO_COLORS } from '../appointment';

interface Props {
    estado: CitaEstado;
}

export const AppointmentStatusBadge: React.FC<Props> = ({ estado }) => {
    const color = CITA_ESTADO_COLORS[estado];
    return (
        <span
            className="cita-status-badge"
            style={{
                backgroundColor: `${color}15`,
                color: color,
                borderColor: `${color}40`,
            }}
        >
            <i className={CITA_ESTADO_ICONS[estado]}></i>
            {CITA_ESTADO_LABELS[estado]}
        </span>
    );
};
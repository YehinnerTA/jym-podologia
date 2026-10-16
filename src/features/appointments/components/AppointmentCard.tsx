import React from 'react';
import { Cita } from '../appointment';
import { AppointmentStatusBadge } from './AppointmentStatusBadge';
import { formatRango, formatFecha } from '../utils/appointmentHelpers';

interface Props {
    cita: Cita;
    onView: (c: Cita) => void;
    onEdit: (c: Cita) => void;
    onCancel: (c: Cita) => void;
}

export const AppointmentCard: React.FC<Props> = ({ cita, onView, onEdit, onCancel }) => {
    return (
        <div className="cita-card">
            <div className="cita-card-header">
                <div className="cita-card-hora">{formatRango(cita.fechaInicio, cita.fechaFin)}</div>
                <AppointmentStatusBadge estado={cita.estado} />
            </div>

            <div className="cita-card-body">
                <div className="cita-card-row">
                    <i className="fa-solid fa-user"></i>
                    <span>{cita.pacienteNombre}</span>
                </div>
                <div className="cita-card-row">
                    <i className="fa-solid fa-calendar"></i>
                    <span>{formatFecha(cita.fechaInicio)}</span>
                </div>
                <div className="cita-card-row">
                    <i className="fa-solid fa-briefcase-medical"></i>
                    <span>{cita.servicioNombre} ({cita.duracionMin} min)</span>
                </div>
                {cita.medicoNombre && (
                    <div className="cita-card-row">
                        <i className="fa-solid fa-user-doctor"></i>
                        <span>{cita.medicoNombre}</span>
                    </div>
                )}
            </div>

            <div className="cita-card-actions">
                <button type="button" className="cita-action-btn" onClick={() => onView(cita)}>
                    <i className="fa-solid fa-eye"></i>
                </button>
                <button type="button" className="cita-action-btn" onClick={() => onEdit(cita)}>
                    <i className="fa-solid fa-pen"></i>
                </button>
                <button type="button" className="cita-action-btn danger" onClick={() => onCancel(cita)}>
                    <i className="fa-solid fa-ban"></i>
                </button>
            </div>
        </div>
    );
};
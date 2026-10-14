import React from 'react';
import { Sede } from '../sede';

interface Props {
    sede: Sede;
    onView: (sede: Sede) => void;
    onEdit: (sede: Sede) => void;
    onDelete: (sede: Sede) => void;
}

export const SedeCard: React.FC<Props> = ({ sede, onView, onEdit, onDelete }) => {
    return (
        <div className="sede-card">
            <div className="sede-card-header">
                <div className="sede-card-icon">
                    <i className="fa-solid fa-hospital"></i>
                </div>
                <div className="sede-card-info">
                    <h3 className="sede-card-name">{sede.nombre}</h3>
                    <p className="sede-card-ruc">RUC: {sede.ruc}</p>
                </div>
            </div>

            <div className="sede-card-body">
                <div className="sede-card-row">
                    <i className="fa-solid fa-location-dot"></i>
                    <span>{sede.direccion}</span>
                </div>
                {sede.telefono && (
                    <div className="sede-card-row">
                        <i className="fa-solid fa-phone"></i>
                        <span>{sede.telefono}</span>
                    </div>
                )}
                <div className="sede-card-badges">
                    <span className="sede-badge">
                        <i className="fa-solid fa-users"></i> {sede.cuposPorHorario} cupo(s)
                    </span>
                    <span className="sede-badge">
                        <i className="fa-solid fa-door-open"></i> {sede.habitaciones} hab.
                    </span>
                    {sede.esPredeterminada && (
                        <span className="sede-badge predeterminada">
                            <i className="fa-solid fa-star"></i> Predeterminada
                        </span>
                    )}
                    <span className={`sede-badge ${sede.activo ? 'activa' : 'inactiva'}`}>
                        {sede.activo ? 'Activa' : 'Inactiva'}
                    </span>
                </div>
            </div>

            <div className="sede-card-actions">
                <button
                    type="button"
                    className="sede-action-btn"
                    onClick={() => onView(sede)}
                    aria-label="Ver detalle"
                >
                    <i className="fa-solid fa-eye"></i>
                </button>
                <button
                    type="button"
                    className="sede-action-btn"
                    onClick={() => onEdit(sede)}
                    aria-label="Editar"
                >
                    <i className="fa-solid fa-pen"></i>
                </button>
                <button
                    type="button"
                    className="sede-action-btn danger"
                    onClick={() => onDelete(sede)}
                    aria-label="Eliminar"
                >
                    <i className="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>
    );
};
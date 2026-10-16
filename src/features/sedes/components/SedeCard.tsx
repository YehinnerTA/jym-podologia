import React from 'react';
import { Sede } from '../sede';

interface Props {
    sede: Sede;
    onView: (sede: Sede) => void;
    onEdit: (sede: Sede) => void;
    onDelete: (sede: Sede) => void;
}

export const SedeCard: React.FC<Props> = ({
    sede,
    onView,
    onEdit,
    onDelete,
}) => {
    return (
        <div className="sede-card">
            <div className="sede-card-header">
                <div className="sede-card-icon">
                    <i className="fa-solid fa-hospital"></i>
                </div>

                <div className="sede-card-info">
                    <h3 className="sede-card-name">
                        {sede.nombre}
                    </h3>
                </div>
            </div>

            <div className="sede-card-body">
                <div className="sede-card-row">
                    <i className="fa-solid fa-location-dot"></i>
                    <span>
                        {sede.direccion || 'Dirección no registrada'}
                    </span>
                </div>

                {sede.telefono && (
                    <div className="sede-card-row">
                        <i className="fa-solid fa-phone"></i>
                        <span>{sede.telefono}</span>
                    </div>
                )}

                {sede.email && (
                    <div className="sede-card-row">
                        <i className="fa-solid fa-envelope"></i>
                        <span>{sede.email}</span>
                    </div>
                )}

                <div className="sede-card-badges">
                    <span className="sede-badge">
                        <i className="fa-solid fa-users"></i>
                        {' '}
                        {sede.cuposPorHorario ?? 0} cupo(s)
                    </span>

                    <span className="sede-badge">
                        <i className="fa-solid fa-door-open"></i>
                        {' '}
                        {sede.habitaciones ?? 0} hab.
                    </span>

                    {sede.esPredeterminada && (
                        <span className="sede-badge predeterminada">
                            <i className="fa-solid fa-star"></i>
                            {' '}
                            Predeterminada
                        </span>
                    )}

                    <span
                        className={`sede-badge ${sede.activo ? 'activa' : 'inactiva'
                            }`}
                    >
                        <i
                            className={`fa-solid ${sede.activo
                                ? 'fa-circle-check'
                                : 'fa-circle-xmark'
                                }`}
                        ></i>
                        {' '}
                        {sede.activo ? 'Activa' : 'Inactiva'}
                    </span>
                </div>
            </div>

            <div className="sede-card-actions">
                <button
                    type="button"
                    className="sede-action-btn"
                    onClick={() => onView(sede)}
                    aria-label={`Ver detalle de ${sede.nombre}`}
                    title="Ver detalle"
                >
                    <i className="fa-solid fa-eye"></i>
                </button>

                <button
                    type="button"
                    className="sede-action-btn"
                    onClick={() => onEdit(sede)}
                    aria-label={`Editar ${sede.nombre}`}
                    title="Editar sede"
                >
                    <i className="fa-solid fa-pen"></i>
                </button>

                <button
                    type="button"
                    className="sede-action-btn danger"
                    onClick={() => onDelete(sede)}
                    aria-label={`Eliminar ${sede.nombre}`}
                    title="Eliminar sede"
                >
                    <i className="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>
    );
};
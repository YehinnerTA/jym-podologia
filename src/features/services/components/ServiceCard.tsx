import React from 'react';

import {
    Servicio,
    SERVICIO_CATEGORIA_LABELS,
} from '../service';

import '../services.css';

interface Props {
    servicio: Servicio;
    onView: (servicio: Servicio) => void;
    onEdit: (servicio: Servicio) => void;
    onToggleActivo: (servicio: Servicio) => void;
}

export const ServiceCard: React.FC<Props> = ({
    servicio,
    onView,
    onEdit,
    onToggleActivo,
}) => {
    const precioFormateado = new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN',
    }).format(servicio.precio);

    const totalSedes = servicio.sedesIds?.length || 0;

    return (
        <div className="service-card">
            {/* Encabezado */}
            <div className="service-card-header">
                <div className="service-card-icon">
                    <i className="fa-solid fa-stethoscope"></i>
                </div>

                <div className="service-card-info">
                    <h3 className="service-card-name">
                        {servicio.nombre}
                    </h3>

                    <p className="service-card-category">
                        {SERVICIO_CATEGORIA_LABELS[servicio.categoria]}
                    </p>
                </div>
            </div>

            {/* Información del servicio */}
            <div className="service-card-body">
                <div className="service-card-row">
                    <i className="fa-solid fa-clock"></i>
                    <span>
                        Duración: {servicio.duracionMin} minutos
                    </span>
                </div>

                <div className="service-card-row">
                    <i className="fa-solid fa-money-bill-wave"></i>
                    <span>
                        Precio: {precioFormateado}
                    </span>
                </div>

                <div className="service-card-row">
                    <i className="fa-solid fa-building"></i>
                    <span>
                        {totalSedes === 1
                            ? 'Disponible en 1 sede'
                            : `Disponible en ${totalSedes} sedes`}
                    </span>
                </div>

                {servicio.descripcion && (
                    <div className="service-card-row">
                        <i className="fa-solid fa-align-left"></i>
                        <span>{servicio.descripcion}</span>
                    </div>
                )}

                {/* Estado */}
                <div className="service-badges">
                    <span
                        className={`service-badge ${servicio.activo ? 'activa' : 'inactiva'
                            }`}
                    >
                        <i
                            className={`fa-solid ${servicio.activo
                                ? 'fa-circle-check'
                                : 'fa-circle-xmark'
                                }`}
                        ></i>

                        {servicio.activo ? 'Activo' : 'Inactivo'}
                    </span>
                </div>
            </div>

            {/* Acciones */}
            <div className="service-card-actions">
                <button
                    type="button"
                    className="service-action-btn"
                    onClick={() => onView(servicio)}
                    title="Ver detalles"
                    aria-label={`Ver detalles de ${servicio.nombre}`}
                >
                    <i className="fa-solid fa-eye"></i>
                </button>

                <button
                    type="button"
                    className="service-action-btn"
                    onClick={() => onEdit(servicio)}
                    title="Editar servicio"
                    aria-label={`Editar ${servicio.nombre}`}
                >
                    <i className="fa-solid fa-pen"></i>
                </button>

                <button
                    type="button"
                    className={`service-action-btn ${servicio.activo ? 'danger' : 'success'
                        }`}
                    onClick={() => onToggleActivo(servicio)}
                    title={
                        servicio.activo
                            ? 'Desactivar servicio'
                            : 'Activar servicio'
                    }
                    aria-label={`${servicio.activo ? 'Desactivar' : 'Activar'
                        } ${servicio.nombre}`}
                >
                    <i
                        className={`fa-solid ${servicio.activo ? 'fa-ban' : 'fa-check'
                            }`}
                    ></i>
                </button>
            </div>
        </div>
    );
};
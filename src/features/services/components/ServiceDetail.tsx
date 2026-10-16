import React from 'react';

import {
    AppModal,
    AppButton,
} from '../../../components';

import { useCompany } from '../../company/context/CompanyContext';
import { useAuth } from '../../auth/context/AuthContext';

import {
    Servicio,
    SERVICIO_CATEGORIA_LABELS,
} from '../service';

import '../services.css';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    servicio: Servicio | null;
    onEdit: (servicio: Servicio) => void;
}

export const ServiceDetail: React.FC<Props> = ({
    isOpen,
    onClose,
    servicio,
    onEdit,
}) => {
    const { sedes } = useCompany();
    const { role } = useAuth();

    if (!servicio) return null;

    const precioFormateado = new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN',
    }).format(servicio.precio);

    const sedesVinculadas = sedes.filter((sede) =>
        servicio.sedesIds.includes(sede.id)
    );

    return (
        <AppModal
            isOpen={isOpen}
            onClose={onClose}
            title="Detalle del servicio"
            icon="fa-solid fa-stethoscope"
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
                            onClick={() => onEdit(servicio)}
                        >
                            Editar servicio
                        </AppButton>
                    )}
                </>
            }
        >
            <div className="service-detail">
                <div className="service-detail-header">
                    <div className="service-detail-avatar">
                        <i className="fa-solid fa-stethoscope"></i>
                    </div>

                    <div className="service-detail-info">
                        <h2>{servicio.nombre}</h2>

                        <p>
                            {
                                SERVICIO_CATEGORIA_LABELS[
                                servicio.categoria
                                ]
                            }
                        </p>

                        <div className="service-detail-badges">
                            <span
                                className={`service-badge ${servicio.activo
                                    ? 'activa'
                                    : 'inactiva'
                                    }`}
                            >
                                {servicio.activo
                                    ? 'Activo'
                                    : 'Inactivo'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="service-detail-grid">
                    <div className="service-detail-item">
                        <span className="service-detail-label">
                            Duración
                        </span>

                        <span className="service-detail-value">
                            {servicio.duracionMin} minutos
                        </span>
                    </div>

                    <div className="service-detail-item">
                        <span className="service-detail-label">
                            Precio
                        </span>

                        <span className="service-detail-value">
                            {precioFormateado}
                        </span>
                    </div>

                    <div className="service-detail-item full">
                        <span className="service-detail-label">
                            Descripción
                        </span>

                        <span className="service-detail-value">
                            {servicio.descripcion ||
                                'Sin descripción registrada.'}
                        </span>
                    </div>
                </div>

                <div className="service-detail-section">
                    <h3>
                        <i className="fa-solid fa-hospital"></i>
                        {' '}Sedes vinculadas
                    </h3>

                    {sedesVinculadas.length > 0 ? (
                        <div className="service-detail-sedes">
                            {sedesVinculadas.map((sede) => (
                                <span
                                    key={sede.id}
                                    className="service-detail-sede-tag"
                                >
                                    <i className="fa-solid fa-building"></i>
                                    {sede.nombre}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="person-detail-sin-sedes">
                            No se encontraron sedes vinculadas.
                        </p>
                    )}
                </div>
            </div>
        </AppModal>
    );
};
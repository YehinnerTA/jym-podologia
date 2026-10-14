import React from 'react';
import { AppModal, AppButton } from '../../../components';
import { Persona } from '../person';
import { PersonTypeBadge } from './PersonTypeBadge';
import { useCompany } from '../../company/context/CompanyContext';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    persona: Persona | null;
    onEdit: (p: Persona) => void;
}

export const PersonDetail: React.FC<Props> = ({ isOpen, onClose, persona, onEdit }) => {
    const { sedes } = useCompany();
    if (!persona) return null;

    const sedesAsignadas = sedes.filter((s) => persona.sedesIds.includes(s.id));

    return (
        <AppModal
            isOpen={isOpen}
            onClose={onClose}
            title="Detalle de Persona"
            icon="fa-solid fa-user"
            size="md"
            footer={
                <>
                    <AppButton variant="ghost" onClick={onClose}>Cerrar</AppButton>
                    <AppButton
                        variant="primary"
                        icon="fa-solid fa-pen"
                        iconPosition="left"
                        onClick={() => onEdit(persona)}
                    >
                        Editar
                    </AppButton>
                </>
            }
        >
            <div className="person-detail">
                <div className="person-detail-header">
                    <div className="person-detail-avatar">
                        {persona.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="person-detail-info">
                        <h2>{persona.nombre}</h2>
                        <p>DNI: {persona.dni}</p>
                        <div className="person-detail-badges">
                            <PersonTypeBadge tipo={persona.tipo} />
                            <span className={`person-badge ${persona.activo ? 'activa' : 'inactiva'}`}>
                                {persona.activo ? 'Activo' : 'Inactivo'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="person-detail-grid">
                    <div className="person-detail-item">
                        <span className="person-detail-label">WhatsApp</span>
                        <span className="person-detail-value">{persona.whatsapp}</span>
                    </div>
                    <div className="person-detail-item">
                        <span className="person-detail-label">Email</span>
                        <span className="person-detail-value">{persona.email || '—'}</span>
                    </div>
                    <div className="person-detail-item full">
                        <span className="person-detail-label">Dirección</span>
                        <span className="person-detail-value">{persona.direccion || '—'}</span>
                    </div>
                    <div className="person-detail-item">
                        <span className="person-detail-label">Fecha nacimiento</span>
                        <span className="person-detail-value">{persona.fechaNacimiento || '—'}</span>
                    </div>
                    <div className="person-detail-item">
                        <span className="person-detail-label">Género</span>
                        <span className="person-detail-value">{persona.genero || '—'}</span>
                    </div>
                </div>

                {persona.tipo === 'medico' && (
                    <div className="person-detail-section">
                        <h3>Datos profesionales</h3>
                        <div className="person-detail-grid">
                            <div className="person-detail-item">
                                <span className="person-detail-label">Especialidad</span>
                                <span className="person-detail-value">{persona.especialidad || '—'}</span>
                            </div>
                            <div className="person-detail-item">
                                <span className="person-detail-label">N° Colegiatura</span>
                                <span className="person-detail-value">{persona.numeroColegiatura || '—'}</span>
                            </div>
                        </div>
                    </div>
                )}

                {persona.tipo === 'paciente' && (
                    <div className="person-detail-section">
                        <h3>Información médica</h3>
                        <div className="person-detail-grid">
                            <div className="person-detail-item full">
                                <span className="person-detail-label">Alergias</span>
                                <span className="person-detail-value">{persona.alergias || 'Ninguna'}</span>
                            </div>
                            <div className="person-detail-item full">
                                <span className="person-detail-label">Antecedentes</span>
                                <span className="person-detail-value">{persona.antecedentes || 'Ninguno'}</span>
                            </div>
                            <div className="person-detail-item full">
                                <span className="person-detail-label">Notas</span>
                                <span className="person-detail-value">{persona.notas || '—'}</span>
                            </div>
                        </div>
                    </div>
                )}

                {persona.esTrabajador && (
                    <div className="person-detail-section">
                        <h3>Acceso al sistema</h3>
                        <div className="person-detail-grid">
                            <div className="person-detail-item">
                                <span className="person-detail-label">Usuario</span>
                                <span className="person-detail-value">{persona.username || '—'}</span>
                            </div>
                            <div className="person-detail-item">
                                <span className="person-detail-label">Sede a cargo</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="person-detail-section">
                    <h3>Sedes asignadas</h3>
                    {sedesAsignadas.length === 0 ? (
                        <p className="person-detail-sin-sedes">Sin sedes asignadas</p>
                    ) : (
                        <div className="person-detail-sedes">
                            {sedesAsignadas.map((s) => (
                                <span key={s.id} className="person-detail-sede-tag">
                                    <i className="fa-solid fa-hospital"></i> {s.nombre}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AppModal>
    );
};
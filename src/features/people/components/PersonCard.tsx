import React from 'react';
import { Persona } from '../person';
import { PersonTypeBadge } from './PersonTypeBadge';

interface Props {
    persona: Persona;
    onView: (p: Persona) => void;
    onEdit: (p: Persona) => void;
    onToggleActivo: (p: Persona) => void;
}

export const PersonCard: React.FC<Props> = ({ persona, onView, onEdit, onToggleActivo }) => {
    return (
        <div className="person-card">
            <div className="person-card-header">
                <div className="person-card-avatar">
                    {persona.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="person-card-info">
                    <h3 className="person-card-name">{persona.nombre}</h3>
                    <p className="person-card-dni">DNI: {persona.dni}</p>
                </div>
            </div>

            <div className="person-card-body">
                <div className="person-card-row">
                    <i className="fa-brands fa-whatsapp"></i>
                    <span>{persona.whatsapp}</span>
                </div>
                {persona.email && (
                    <div className="person-card-row">
                        <i className="fa-solid fa-envelope"></i>
                        <span>{persona.email}</span>
                    </div>
                )}
                <div className="person-card-badges">
                    <PersonTypeBadge tipo={persona.tipo} />
                    <span className={`person-badge ${persona.activo ? 'activa' : 'inactiva'}`}>
                        {persona.activo ? 'Activo' : 'Inactivo'}
                    </span>
                </div>
            </div>

            <div className="person-card-actions">
                <button type="button" className="person-action-btn" onClick={() => onView(persona)}>
                    <i className="fa-solid fa-eye"></i>
                </button>
                <button type="button" className="person-action-btn" onClick={() => onEdit(persona)}>
                    <i className="fa-solid fa-pen"></i>
                </button>
                <button
                    type="button"
                    className={`person-action-btn ${persona.activo ? 'danger' : 'success'}`}
                    onClick={() => onToggleActivo(persona)}
                >
                    <i className={`fa-solid ${persona.activo ? 'fa-user-slash' : 'fa-user-check'}`}></i>
                </button>
            </div>
        </div>
    );
};
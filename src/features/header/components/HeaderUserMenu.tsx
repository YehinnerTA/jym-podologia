import React, { useState, useRef, useEffect } from 'react';

interface Props {
    nombre: string;
    inicial: string;
    email: string;
    subRol: string | null;
    onLogout: () => void;
    onOpenProfile: () => void;
}

export const HeaderUserMenu: React.FC<Props> = ({
    nombre,
    inicial,
    email,
    subRol,
    onLogout,
    onOpenProfile,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const subRolLabel = subRol === 'medico' ? 'Médico' : subRol === 'recepcion' ? 'Recepción' : '';

    return (
        <div className="jym-user-menu" ref={ref}>
            <button
                type="button"
                className="jym-user-trigger"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                <span className="jym-user-avatar">{inicial}</span>
                <span className="jym-user-info">
                    <span className="jym-user-name">{nombre}</span>
                    {subRolLabel && <span className="jym-user-role">{subRolLabel}</span>}
                </span>
                <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'} jym-user-chevron`}></i>
            </button>

            {isOpen && (
                <div className="jym-user-dropdown">
                    <div className="jym-user-dropdown-header">
                        <span className="jym-user-avatar-lg">{inicial}</span>
                        <div>
                            <p className="jym-user-dropdown-name">{nombre}</p>
                            <p className="jym-user-dropdown-email">{email}</p>
                        </div>
                    </div>
                    <div className="jym-user-dropdown-divider"></div>
                    <button type="button" className="jym-user-dropdown-item" onClick={() => { onOpenProfile(); setIsOpen(false); }} >
                        <i className="fa-solid fa-user"></i> Mi perfil
                    </button>
                    <button type="button" className="jym-user-dropdown-item">
                        <i className="fa-solid fa-gear"></i> Configuración
                    </button>
                    <div className="jym-user-dropdown-divider"></div>
                    <button
                        type="button"
                        className="jym-user-dropdown-item danger"
                        onClick={onLogout}
                    >
                        <i className="fa-solid fa-right-from-bracket"></i> Cerrar sesión
                    </button>
                </div>
            )}
        </div>
    );
};
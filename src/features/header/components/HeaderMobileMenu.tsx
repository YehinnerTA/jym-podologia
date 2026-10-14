import React from 'react';
import { NavLink } from '../header';
import { Sede } from '../../company/sede';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    closeRef: React.RefObject<HTMLButtonElement | null>;
    navLinks: NavLink[];
    onNavigate: (path: string) => void;
    sedes: Sede[];
    selectedSede: string | null;
    multiplesSedes: boolean;
    onSedeChange: (id: string) => void;
    onOpenNotif: () => void;
    onLogout: () => void;
    nombre: string;
    inicial: string;
}

export const HeaderMobileMenu: React.FC<Props> = ({
    isOpen,
    onClose,
    closeRef,
    navLinks,
    onNavigate,
    sedes,
    selectedSede,
    multiplesSedes,
    onSedeChange,
    onOpenNotif,
    onLogout,
    nombre,
    inicial,
}) => {
    return (
        <>
            <div
                className={`jym-overlay ${isOpen ? 'active' : ''}`}
                onClick={onClose}
                aria-hidden={!isOpen}
            />
            <aside className={`jym-mobile-menu ${isOpen ? 'active' : ''}`} aria-hidden={!isOpen}>
                <div className="jym-mobile-header">
                    <span className="jym-mobile-title">Menú</span>
                    <button
                        type="button"
                        ref={closeRef}
                        className="jym-mobile-close"
                        onClick={onClose}
                        aria-label="Cerrar menú"
                    >
                        &times;
                    </button>
                </div>

                <div className="jym-mobile-body">
                    {/* Sede */}
                    {multiplesSedes ? (
                        <div className="jym-mobile-sede">
                            <label htmlFor="mobileSedeSelect">
                                <i className="fa-solid fa-hospital"></i> Sede
                            </label>
                            <select
                                id="mobileSedeSelect"
                                value={selectedSede || ''}
                                onChange={(e) => onSedeChange(e.target.value)}
                            >
                                {sedes.map(s => (
                                    <option key={s.id} value={s.id}>{s.nombre}</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div className="jym-mobile-sede-fixed">
                            <i className="fa-solid fa-hospital"></i>
                            <span>{sedes[0]?.nombre || 'Sin sede'}</span>
                        </div>
                    )}

                    {/* Navegación */}
                    <nav className="jym-mobile-nav">
                        <ul>
                            {navLinks.map(link => (
                                <li key={link.path}>
                                    <button
                                        type="button"
                                        onClick={() => onNavigate(link.path)}
                                        className="jym-mobile-nav-link"
                                    >
                                        <i className={link.icon}></i>
                                        <span>{link.name}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    {/* Acciones */}
                    <div className="jym-mobile-actions">
                        <button
                            type="button"
                            className="jym-mobile-action"
                            onClick={() => { onClose(); setTimeout(onOpenNotif, 200); }}
                        >
                            <i className="fa-solid fa-bell"></i>
                            <span>Notificaciones</span>
                        </button>

                        <div className="jym-mobile-user">
                            <span className="jym-user-avatar">{inicial}</span>
                            <span>{nombre}</span>
                        </div>

                        <button
                            type="button"
                            className="jym-mobile-action danger"
                            onClick={() => { onClose(); setTimeout(onLogout, 200); }}
                        >
                            <i className="fa-solid fa-right-from-bracket"></i>
                            <span>Cerrar sesión</span>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};
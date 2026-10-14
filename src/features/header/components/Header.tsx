import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useHeader } from '../hooks/useHeader';
import { HeaderSedeSelector } from './HeaderSedeSelector';
import { HeaderNotifications } from './HeaderNotifications';
import { HeaderUserMenu } from './HeaderUserMenu';
import { HeaderMobileMenu } from './HeaderMobileMenu';
import { MyProfile } from '../../profile/components/MyProfile';
import '../header.css';

const Header: React.FC = () => {
    const [profileOpen, setProfileOpen] = useState(false);
    const location = useLocation();

    const {
        user,
        subRol,
        nombreUsuario,
        inicialUsuario,
        sedes,
        selectedSede,
        multiplesSedes,
        handleSedeChange,
        navLinks,
        handleNavigate,
        handleLogoClick,
        notificaciones,
        noLeidas,
        isModalOpen: isNotifOpen,
        openModal: openNotif,
        closeModal: closeNotif,
        marcarComoLeida,
        marcarTodasComoLeidas,
        mobileMenu,
        handleLogout,
    } = useHeader();

    return (
        <>
            <header className="jym-header">
                <div className="jym-header-container">
                    {/* Hamburger (móvil) */}
                    <button
                        type="button"
                        ref={mobileMenu.hamburgerRef}
                        className="jym-hamburger"
                        onClick={mobileMenu.open}
                        aria-label="Abrir menú"
                    >
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>

                    {/* Logo */}
                    <button
                        type="button"
                        className="jym-logo"
                        onClick={handleLogoClick}
                        aria-label="Ir al dashboard"
                    >
                        <img src="/logo-jym.png" alt="J&M Podología" />
                        <span className="jym-logo-text">J&M Podología</span>
                    </button>

                    {/* Navegación desktop */}
                    <nav className="jym-nav">
                        <ul className="jym-nav-links">
                            {navLinks.map((link) => {
                                const isActive = location.pathname === link.path;
                                return (
                                    <li key={link.path}>
                                        <button
                                            type="button"
                                            className={`jym-nav-link ${isActive ? 'active' : ''}`}
                                            onClick={() => handleNavigate(link.path)}
                                        >
                                            <i className={link.icon}></i>
                                            <span>{link.name}</span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>

                    {/* Sede */}
                    <div className="jym-header-sede">
                        <HeaderSedeSelector
                            sedes={sedes}
                            selectedSede={selectedSede}
                            multiplesSedes={multiplesSedes}
                            onChange={handleSedeChange}
                        />
                    </div>

                    {/* Acciones derecha */}
                    <div className="jym-header-actions">
                        <HeaderNotifications
                            notificaciones={notificaciones}
                            noLeidas={noLeidas}
                            isModalOpen={isNotifOpen}
                            onOpen={openNotif}
                            onClose={closeNotif}
                            onMarcarLeida={marcarComoLeida}
                            onMarcarTodas={marcarTodasComoLeidas}
                        />

                        <HeaderUserMenu
                            nombre={nombreUsuario}
                            inicial={inicialUsuario}
                            email={user?.email || ''}
                            subRol={subRol}
                            onLogout={handleLogout}
                            onOpenProfile={() => setProfileOpen(true)}
                        />
                    </div>
                </div>
            </header>

            <HeaderMobileMenu
                isOpen={mobileMenu.isOpen}
                onClose={mobileMenu.close}
                closeRef={mobileMenu.closeRef}
                navLinks={navLinks}
                onNavigate={handleNavigate}
                sedes={sedes}
                selectedSede={selectedSede}
                multiplesSedes={multiplesSedes}
                onSedeChange={handleSedeChange}
                onOpenNotif={openNotif}
                onLogout={handleLogout}
                nombre={nombreUsuario}
                inicial={inicialUsuario}
            />

            <MyProfile isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
        </>
    );
};

export default Header;
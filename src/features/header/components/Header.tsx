import React from 'react';
import { useHeader } from '../hooks/useHeader';
import { HeaderSedeSelector } from './HeaderSedeSelector';
import { HeaderNotifications } from './HeaderNotifications';
import { HeaderUserMenu } from './HeaderUserMenu';
import { HeaderMobileMenu } from './HeaderMobileMenu';
import '../header.css';

const Header: React.FC = () => {
    const {
        user,
        subRol,
        nombreUsuario,
        inicialUsuario,
        sedes,
        sedeActiva,
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
        </>
    );
};

export default Header;
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../../auth/context/AuthContext';

import { SedeSelectorMenuProps } from '../../sedes/sede';

import {
    AppButton,
    AppCard,
    AppLoader,
    AppBadge,
    AppEmptyState,
} from '../../../components';

import '../SelectSede.css';

export const SelectSede: React.FC<SedeSelectorMenuProps> = ({
    onSelect,
    redirectTo = '/dashboard',
}) => {
    const navigate = useNavigate();

    const {
        selectedSede,
        setSelectedSede,
        sedes,
        isLoading,
    } = useCompany();

    const {
        role,
        logout,
        isLoading: authLoading,
    } = useAuth();

    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [logoutError, setLogoutError] = useState('');

    // Con una única sede disponible, ingresar directamente.
    useEffect(() => {
        if (authLoading || isLoading) return;

        if (sedes.length === 1) {
            const sedeId = sedes[0].id;

            setSelectedSede(sedeId);
            onSelect?.(sedeId);

            navigate(redirectTo, {
                replace: true,
            });
        }
    }, [
        authLoading,
        isLoading,
        sedes,
        setSelectedSede,
        navigate,
        redirectTo,
        onSelect,
    ]);

    // Cerrar realmente la sesión de Firebase.
    const handleLogout = async () => {
        if (isLoggingOut) return;

        setIsLoggingOut(true);
        setLogoutError('');

        try {
            await logout();

            navigate('/login', {
                replace: true,
            });
        } catch (error) {
            console.error(
                'Error cerrando sesión:',
                error
            );

            setLogoutError(
                'No se pudo cerrar la sesión. Inténtalo nuevamente.'
            );
        } finally {
            setIsLoggingOut(false);
        }
    };

    const handleSelectSede = (sedeId: string) => {
        const autorizada = sedes.some(
            (sede) => sede.id === sedeId
        );

        if (!autorizada) return;

        setSelectedSede(sedeId);
        onSelect?.(sedeId);
    };

    const handleContinue = () => {
        if (!selectedSede) return;

        const autorizada = sedes.some(
            (sede) => sede.id === selectedSede
        );

        if (!autorizada) return;

        navigate(redirectTo, {
            replace: true,
        });
    };

    // Mantener la pantalla de carga hasta terminar
    // la verificación del usuario y sus sedes.
    if (authLoading || isLoading) {
        return (
            <div className="ruc-selector-page">
                <AppCard padding="md">
                    <AppLoader
                        message="Verificando sedes disponibles..."
                    />
                </AppCard>
            </div>
        );
    }

    // Sin sedes disponibles:
    // impedir continuar y ofrecer cerrar sesión.
    if (sedes.length === 0) {
        return (
            <div className="ruc-selector-page">
                <AppCard padding="lg">
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '1.25rem',
                        }}
                    >
                        <AppEmptyState
                            icon="fa-solid fa-triangle-exclamation"
                            title={
                                role === 'admin'
                                    ? 'No hay sedes activas disponibles'
                                    : 'Sin sedes asignadas'
                            }
                            message={
                                role === 'admin'
                                    ? 'No existen sedes activas disponibles para ingresar. Verifica que haya al menos una sede registrada y activa.'
                                    : 'Tu usuario no tiene sedes activas asignadas. Comunícate con el administrador para solicitar acceso.'
                            }
                        />

                        {logoutError && (
                            <p
                                role="alert"
                                style={{
                                    color: '#dc2626',
                                    textAlign: 'center',
                                }}
                            >
                                {logoutError}
                            </p>
                        )}

                        <AppButton
                            variant="primary"
                            icon="fa-solid fa-right-from-bracket"
                            iconPosition="left"
                            loading={isLoggingOut}
                            onClick={handleLogout}
                        >
                            Cerrar sesión
                        </AppButton>
                    </div>
                </AppCard>
            </div>
        );
    }

    // Con una sede, mostrar carga mientras se redirige.
    if (sedes.length === 1) {
        return (
            <div className="ruc-selector-page">
                <AppCard padding="md">
                    <AppLoader
                        message="Ingresando a tu sede..."
                    />
                </AppCard>
            </div>
        );
    }

    // Con varias sedes, permitir que el usuario elija.
    return (
        <div className="ruc-selector-page">
            <div className="ruc-selector-card">
                <div className="ruc-selector-header">
                    <img
                        src="/logo-jym.png"
                        alt="J&M Podología"
                        className="ruc-selector-logo"
                    />

                    <h2 className="ruc-selector-title">
                        Selecciona tu sede
                    </h2>
                </div>

                <div className="ruc-selector-grid">
                    {sedes.map((sede) => (
                        <div
                            key={sede.id}
                            className={`ruc-selector-option ${selectedSede === sede.id
                                ? 'active'
                                : ''
                                }`}
                            onClick={() =>
                                handleSelectSede(sede.id)
                            }
                        >
                            <div className="ruc-selector-option-icon">
                                <i className="fas fa-hospital"></i>
                            </div>

                            <div className="ruc-selector-option-label">
                                {sede.nombre}
                            </div>

                            {sede.direccion && (
                                <div className="ruc-selector-option-code">
                                    {sede.direccion}
                                </div>
                            )}

                            {sede.esPredeterminada && (
                                <AppBadge
                                    variant="success"
                                    icon="fas fa-star"
                                >
                                    Predeterminada
                                </AppBadge>
                            )}

                            {selectedSede === sede.id && (
                                <AppBadge
                                    variant="primary"
                                    icon="fas fa-check-circle"
                                >
                                    Seleccionada
                                </AppBadge>
                            )}
                        </div>
                    ))}
                </div>

                {logoutError && (
                    <div
                        className="sede-form-api-error"
                        role="alert"
                    >
                        <i className="fa-solid fa-circle-exclamation"></i>
                        <span>{logoutError}</span>
                    </div>
                )}

                <div className="ruc-selector-actions">
                    <AppButton
                        variant="primary"
                        size="lg"
                        icon="fas fa-arrow-right"
                        disabled={
                            !selectedSede ||
                            !sedes.some(
                                (sede) =>
                                    sede.id === selectedSede
                            )
                        }
                        onClick={handleContinue}
                    >
                        Continuar
                    </AppButton>

                    <AppButton
                        variant="ghost"
                        icon="fa-solid fa-right-from-bracket"
                        iconPosition="left"
                        loading={isLoggingOut}
                        onClick={handleLogout}
                    >
                        Cerrar sesión
                    </AppButton>
                </div>
            </div>
        </div>
    );
};
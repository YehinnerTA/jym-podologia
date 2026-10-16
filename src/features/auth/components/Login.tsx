import React, {
    useState,
    useEffect,
} from 'react';

import { useNavigate } from 'react-router-dom';

import { auth } from '../../../config/firebase';

import { useAuth } from '../context/AuthContext';

import { useCompany } from '../../company/context/CompanyContext';

import { useLoginValidation } from '../hooks/useLoginValidation';

import {
    AppButton,
    AppInput,
    AppLoader,
} from '../../../components';

import '../login.css';

export const Login: React.FC = () => {
    const navigate = useNavigate();

    const {
        login,
        isAuthenticated,
        isLoading: authLoading,
    } = useAuth();

    const {
        sedes,
        selectedSede,
        isLoading: sedesLoading,
    } = useCompany();

    const {
        state,
        updateEmail,
        updatePassword,
        validateAll,
    } = useLoginValidation();

    const [rememberMe, setRememberMe] =
        useState(false);

    const [message, setMessage] =
        useState('');

    const [messageType, setMessageType] =
        useState<'error' | 'success'>('error');

    const [isSubmitting, setIsSubmitting] =
        useState(false);

    const [loginSuccess, setLoginSuccess] =
        useState(false);

    /**
     * 1. Detectar cuando la autenticación fue
     * aceptada inicialmente, pero la posterior
     * verificación del usuario resultó inválida.
     *
     * Esto evita que loginSuccess mantenga
     * la pantalla bloqueada indefinidamente.
     */
    useEffect(() => {
        if (!loginSuccess) {
            return;
        }

        if (authLoading) {
            return;
        }

        if (isAuthenticated) {
            return;
        }

        // Mientras Firebase mantiene un usuario,
        // AuthContext puede estar terminando
        // la verificación de sus documentos.
        if (auth.currentUser) {
            return;
        }

        setLoginSuccess(false);

        setMessage(
            'No se pudo verificar el acceso a tu cuenta. ' +
            'Comprueba que esté activa y tenga los permisos correspondientes.'
        );

        setMessageType('error');

    }, [
        loginSuccess,
        authLoading,
        isAuthenticated,
    ]);

    /**
     * 2. Redirigir según las sedes disponibles.
     *
     * No navegamos hasta que Authentication
     * y CompanyContext terminen sus cargas.
     */
    useEffect(() => {
        if (!isAuthenticated) {
            return;
        }

        if (
            authLoading ||
            sedesLoading
        ) {
            return;
        }

        // Sin sedes:
        // SelectSede muestra el bloqueo
        // y el botón Cerrar sesión.
        if (sedes.length === 0) {
            navigate('/select-sede', {
                replace: true,
            });

            return;
        }

        // Una sede:
        // acceso directo al dashboard.
        if (sedes.length === 1) {
            if (selectedSede === sedes[0].id) {
                navigate('/dashboard', {
                    replace: true,
                });
            } else {
                // Permitir que CompanyContext
                // resuelva la selección válida.
                navigate('/select-sede', {
                    replace: true,
                });
            }

            return;
        }

        // Varias sedes:
        // selección manual.
        navigate('/select-sede', {
            replace: true,
        });

    }, [
        isAuthenticated,
        authLoading,
        sedesLoading,
        sedes,
        selectedSede,
        navigate,
    ]);

    /**
     * 3. Iniciar sesión.
     *
     * login() valida las credenciales con Firebase.
     * AuthContext verifica los documentos
     * usuarios y personas.
     */
    const handleSubmit = async (
        event: React.FormEvent
    ) => {
        event.preventDefault();

        if (
            isSubmitting ||
            loginSuccess
        ) {
            return;
        }

        setMessage('');
        setLoginSuccess(false);

        if (!validateAll()) {
            setMessage(
                'Corrige los errores antes de continuar.'
            );

            setMessageType('error');
            return;
        }

        setIsSubmitting(true);

        try {
            const ok = await login(
                state.email.value,
                state.password.value,
                rememberMe
            );

            if (!ok) {
                setLoginSuccess(false);

                setMessage(
                    'No se pudo iniciar sesión. ' +
                    'Verifica tu correo y contraseña.'
                );

                setMessageType('error');
                return;
            }

            // Authentication aceptó las credenciales.
            // Se mantiene la pantalla de verificación
            // mientras AuthContext valida el perfil.
            setLoginSuccess(true);

        } catch (error) {
            console.error(
                'Error iniciando sesión:',
                error
            );

            setLoginSuccess(false);

            setMessage(
                'Ocurrió un error al iniciar sesión. ' +
                'Comprueba tu conexión e inténtalo nuevamente.'
            );

            setMessageType('error');

        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * 4. Gestionar el loader.
     *
     * Mostrarlo durante el acceso válido
     * o cuando se está recuperando
     * una sesión anterior.
     */
    const verifyingSession =
        isAuthenticated ||
        loginSuccess ||
        (
            authLoading &&
            !!auth.currentUser
        );

    const isLoading =
        isSubmitting ||
        authLoading ||
        loginSuccess;

    if (verifyingSession) {
        return (
            <AppLoader
                fullScreen
                message="Verificando tus sedes asignadas..."
            />
        );
    }

    return (
        <div className="login-page-body">
            <div className="login-container">

                {/* Panel decorativo */}
                <div className="login-decoration">
                    <div className="login-decoration-overlay"></div>

                    <div className="login-decoration-content">
                        <div className="login-logo-big">
                            <img
                                src="/logo-jym.png"
                                alt="J&M Podología"
                                className="login-logo-img"
                            />
                        </div>

                        <div className="login-decoration-text">
                            <h2 className="login-decoration-title">
                                J&M Podología
                            </h2>

                            <p className="login-decoration-subtitle">
                                Sistema de Gestión de Citas Podológicas
                            </p>
                        </div>

                        <div className="login-decoration-features">
                            <div className="login-feature-item">
                                <i className="fa-solid fa-calendar-check"></i>
                                <span>Gestión de Citas</span>
                            </div>

                            <div className="login-feature-item">
                                <i className="fa-solid fa-notes-medical"></i>
                                <span>Historial Clínico</span>
                            </div>

                            <div className="login-feature-item">
                                <i className="fa-solid fa-chart-line"></i>
                                <span>Reportes y Métricas</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Formulario */}
                <div className="login-form-panel">
                    <div className="login-form-wrapper">

                        <div className="login-logo-mobile">
                            <img
                                src="/logo-jym.png"
                                alt="J&M Podología"
                                className="login-logo-mobile-img"
                            />
                        </div>

                        <div className="login-header">
                            <h1 className="login-title">
                                Bienvenido
                            </h1>

                            <p className="login-subtitle">
                                Ingresa a tu cuenta para continuar
                            </p>
                        </div>

                        {message && (
                            <div
                                className={`login-alert login-alert-${messageType}`}
                                role="alert"
                            >
                                <i
                                    className={`fa-solid ${messageType === 'error'
                                            ? 'fa-circle-exclamation'
                                            : 'fa-circle-check'
                                        }`}
                                ></i>

                                <span>
                                    {message}
                                </span>
                            </div>
                        )}

                        <form
                            className="login-form"
                            onSubmit={handleSubmit}
                            noValidate
                        >
                            <AppInput
                                id="email"
                                label="Correo Electrónico"
                                labelIcon="fa-solid fa-envelope"
                                icon="fa-solid fa-user"
                                type="email"
                                value={state.email.value}
                                onChange={updateEmail}
                                placeholder="ejemplo@jympodologia.com"
                                autoComplete="email"
                                status={state.email.status}
                                errorMessage={state.email.error}
                                required
                            />

                            <AppInput
                                id="password"
                                label="Contraseña"
                                labelIcon="fa-solid fa-lock"
                                icon="fa-solid fa-key"
                                type="password"
                                value={state.password.value}
                                onChange={updatePassword}
                                placeholder="••••••"
                                autoComplete="current-password"
                                status={state.password.status}
                                errorMessage={state.password.error}
                                required
                                minLength={6}
                                showPasswordToggle
                            />

                            <div className="login-options">
                                <label className="login-remember">
                                    <input
                                        type="checkbox"
                                        className="login-checkbox"
                                        checked={rememberMe}
                                        onChange={(event) =>
                                            setRememberMe(
                                                event.target.checked
                                            )
                                        }
                                    />

                                    <span className="login-checkmark"></span>

                                    <span className="login-remember-text">
                                        Recordarme
                                    </span>
                                </label>

                                <a
                                    href="#"
                                    className="login-forgot"
                                    onClick={(event) =>
                                        event.preventDefault()
                                    }
                                >
                                    ¿Olvidaste tu contraseña?
                                </a>
                            </div>

                            <AppButton
                                type="submit"
                                variant="primary"
                                size="lg"
                                fullWidth
                                loading={isLoading}
                                icon="fa-solid fa-arrow-right"
                            >
                                {isLoading
                                    ? 'Verificando acceso...'
                                    : 'Iniciar Sesión'}
                            </AppButton>
                        </form>

                    </div>
                </div>
            </div>
        </div>
    );
};
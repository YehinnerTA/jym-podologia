import React, { useState, useRef, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLoginValidation } from '../hooks/useLoginValidation';
import { AppButton, AppInput, AppCard, AppLoader } from '../../../components';
import '../login.css';

export const Login: React.FC = () => {
    const navigate = useNavigate();
    const { login, isAuthenticated, isLoading: authLoading } = useAuth();
    const { state, updateEmail, updatePassword, validateAll } = useLoginValidation();

    const [rememberMe, setRememberMe] = useState<boolean>(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState<'error' | 'success'>('error');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/select-sede');
        }
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');

        if (!validateAll()) {
            setMessage('Corrige los errores antes de continuar');
            setMessageType('error');
            return;
        }

        setIsSubmitting(true);
        try {
            const ok = await login(state.email.value, state.password.value, rememberMe);
            if (ok) {
                setMessage('Inicio de sesión exitoso');
                setMessageType('success');
            } else {
                setMessage('Credenciales incorrectas');
                setMessageType('error');
            }
        } catch {
            setMessage('Error de conexión');
            setMessageType('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isLoading = isSubmitting || authLoading;

    return (
        <div className="login-page-body">
            <div className="login-container">
                <div className="login-decoration">
                    <div className="login-decoration-overlay"></div>
                    <div className="login-decoration-content">
                        <div className="login-logo-big">
                            <img src="/logo-jym.png" alt="J&M Podología" className="login-logo-img" />
                        </div>
                        <div className="login-decoration-text">
                            <h2 className="login-decoration-title">J&M Podología</h2>
                            <p className="login-decoration-subtitle">Sistema de Gestión de Citas Podológicas</p>
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

                <div className="login-form-panel">
                    <div className="login-form-wrapper">
                        <div className="login-logo-mobile">
                            <img src="/logo-jym.png" alt="J&M Podología" className="login-logo-mobile-img" />
                        </div>

                        <div className="login-header">
                            <h1 className="login-title">Bienvenido</h1>
                            <p className="login-subtitle">Ingresa a tu cuenta para continuar</p>
                        </div>

                        {message && (
                            <div className={`login-alert login-alert-${messageType}`}>
                                <i className={`fa-solid ${messageType === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'}`}></i>
                                <span>{message}</span>
                            </div>
                        )}

                        <form className="login-form" onSubmit={handleSubmit} noValidate>
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
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                    />
                                    <span className="login-checkmark"></span>
                                    <span className="login-remember-text">Recordarme</span>
                                </label>
                                <a href="#" className="login-forgot">¿Olvidaste tu contraseña?</a>
                            </div>

                            <AppButton
                                type="submit"
                                variant="primary"
                                size="lg"
                                fullWidth
                                loading={isLoading}
                                icon="fa-solid fa-arrow-right"
                            >
                                {isLoading ? 'Iniciando...' : 'Iniciar Sesión'}
                            </AppButton>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};
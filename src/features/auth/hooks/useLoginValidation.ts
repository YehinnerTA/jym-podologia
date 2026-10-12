import { useState, useCallback } from 'react';

interface ValidationState {
    email: {
        value: string;
        isValid: boolean;
        error: string;
        status: 'default' | 'success' | 'error' | 'warning';
    };
    password: {
        value: string;
        isValid: boolean;
        error: string;
        status: 'default' | 'success' | 'error' | 'warning';
    };
}

export const useLoginValidation = () => {
    const [state, setState] = useState<ValidationState>({
        email: { value: '', isValid: false, error: '', status: 'default' },
        password: { value: '', isValid: false, error: '', status: 'default' }
    });

    const validateEmail = useCallback((email: string, showError: boolean = false): boolean => {
        const trimmed = email.trim();

        if (trimmed === '') {
            setState(prev => ({
                ...prev,
                email: {
                    ...prev.email,
                    value: email,
                    isValid: false,
                    error: showError ? 'El correo electrónico es requerido' : '',
                    status: showError ? 'error' : 'default'
                }
            }));
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmed)) {
            setState(prev => ({
                ...prev,
                email: {
                    ...prev.email,
                    value: email,
                    isValid: false,
                    error: showError ? 'Ingresa un correo electrónico válido' : '',
                    status: showError ? 'error' : 'default'
                }
            }));
            return false;
        }

        setState(prev => ({
            ...prev,
            email: {
                ...prev.email,
                value: email,
                isValid: true,
                error: '',
                status: 'success'
            }
        }));
        return true;
    }, []);

    const validatePassword = useCallback((password: string, showError: boolean = false): boolean => {
        if (password === '') {
            setState(prev => ({
                ...prev,
                password: {
                    ...prev.password,
                    value: password,
                    isValid: false,
                    error: showError ? 'La contraseña es requerida' : '',
                    status: showError ? 'error' : 'default'
                }
            }));
            return false;
        }

        if (password.length < 6) {
            setState(prev => ({
                ...prev,
                password: {
                    ...prev.password,
                    value: password,
                    isValid: false,
                    error: showError ? 'La contraseña debe tener al menos 6 caracteres' : '',
                    status: showError ? 'error' : 'default'
                }
            }));
            return false;
        }

        setState(prev => ({
            ...prev,
            password: {
                ...prev.password,
                value: password,
                isValid: true,
                error: '',
                status: 'success'
            }
        }));
        return true;
    }, []);

    const updateEmail = useCallback((email: string) => {
        validateEmail(email, false);
    }, [validateEmail]);

    const updatePassword = useCallback((password: string) => {
        validatePassword(password, false);
    }, [validatePassword]);

    const validateAll = useCallback((): boolean => {
        const isEmailValid = validateEmail(state.email.value, true);
        const isPasswordValid = validatePassword(state.password.value, true);
        return isEmailValid && isPasswordValid;
    }, [state.email.value, state.password.value, validateEmail, validatePassword]);

    return {
        state,
        updateEmail,
        updatePassword,
        validateEmail,
        validatePassword,
        validateAll,
        isFormValid: state.email.isValid && state.password.isValid
    };
};
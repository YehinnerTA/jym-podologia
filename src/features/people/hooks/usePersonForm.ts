import { useState, useCallback } from 'react';
import {
    PersonaFormData,
    PersonaFormErrors,
    PERSONA_FORM_INICIAL,
} from '../person';
import { validatePersonForm, hasErrors } from '../utils/personHelpers';

export const usePersonForm = (initial?: PersonaFormData) => {
    const [data, setData] = useState<PersonaFormData>(initial || PERSONA_FORM_INICIAL);
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<PersonaFormErrors>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const updateField = useCallback(
        <K extends keyof PersonaFormData>(field: K, value: PersonaFormData[K]) => {
            setData((prev) => {
                const next = { ...prev, [field]: value };

                // Si cambia esTrabajador a true, tipo por defecto recepcionista (si es paciente)
                if (field === 'esTrabajador') {
                    if (value === true && next.tipo === 'paciente') {
                        next.tipo = 'recepcionista';
                    }
                    if (value === false) {
                        next.tipo = 'paciente';
                        next.username = '';
                    }
                }

                return next;
            });
            setTouched((prev) => ({ ...prev, [field]: true }));
        },
        []
    );

    const toggleSede = useCallback((sedeId: string) => {
        setData((prev) => {
            const has = prev.sedesIds.includes(sedeId);
            return {
                ...prev,
                sedesIds: has
                    ? prev.sedesIds.filter((id) => id !== sedeId)
                    : [...prev.sedesIds, sedeId],
            };
        });
    }, []);

    const validate = useCallback((): boolean => {
        const errs = validatePersonForm(data, data.esTrabajador ? password : undefined);
        setErrors(errs);
        setTouched(
            Object.keys(data).reduce((acc, k) => ({ ...acc, [k]: true }), {})
        );
        return !hasErrors(errs);
    }, [data, password]);

    const reset = useCallback((newData?: PersonaFormData) => {
        setData(newData || PERSONA_FORM_INICIAL);
        setPassword('');
        setErrors({});
        setTouched({});
    }, []);

    const getFieldError = useCallback(
        (field: keyof PersonaFormErrors): string | undefined => {
            if (!touched[field]) return undefined;
            return errors[field];
        },
        [errors, touched]
    );

    return {
        data,
        password,
        setPassword,
        errors,
        touched,
        updateField,
        toggleSede,
        validate,
        reset,
        getFieldError,
        setErrors,
    };
};
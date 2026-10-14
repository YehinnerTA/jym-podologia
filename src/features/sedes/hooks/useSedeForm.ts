import { useState, useCallback } from 'react';
import {
    SedeFormData,
    SedeFormErrors,
    SEDE_FORM_INICIAL,
} from '../sede';
import { validateSedeForm, hasErrors } from '../utils/sedeHelpers';

export const useSedeForm = (initial?: SedeFormData) => {
    const [data, setData] = useState<SedeFormData>(initial || SEDE_FORM_INICIAL);
    const [errors, setErrors] = useState<SedeFormErrors>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const updateField = useCallback(
        <K extends keyof SedeFormData>(field: K, value: SedeFormData[K]) => {
            setData((prev) => ({ ...prev, [field]: value }));
            setTouched((prev) => ({ ...prev, [field]: true }));
        },
        []
    );

    const updateHorario = useCallback(
        (dia: string, value: { inicio: string; fin: string } | null) => {
            setData((prev) => ({
                ...prev,
                horarioAtencion: {
                    ...prev.horarioAtencion,
                    [dia]: value,
                },
            }));
        },
        []
    );

    const validate = useCallback((): boolean => {
        const errs = validateSedeForm(data);
        setErrors(errs);
        setTouched(
            Object.keys(data).reduce((acc, k) => ({ ...acc, [k]: true }), {})
        );
        return !hasErrors(errs);
    }, [data]);

    const reset = useCallback((newData?: SedeFormData) => {
        setData(newData || SEDE_FORM_INICIAL);
        setErrors({});
        setTouched({});
    }, []);

    const getFieldError = useCallback(
        (field: keyof SedeFormErrors): string | undefined => {
            if (!touched[field]) return undefined;
            return errors[field];
        },
        [errors, touched]
    );

    return {
        data,
        errors,
        touched,
        updateField,
        updateHorario,
        validate,
        reset,
        getFieldError,
        setErrors,
    };
};
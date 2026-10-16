import { useState, useCallback } from 'react';

import {
    ServicioFormData,
    ServicioFormErrors,
    SERVICIO_FORM_INICIAL,
} from '../service';

import {
    validateServiceForm,
    hasServiceErrors,
    buildServiceSedesIds,
} from '../utils/serviceHelpers';

export const useServiceForm = (initial?: ServicioFormData) => {
    const [data, setData] = useState<ServicioFormData>(
        initial
            ? {
                ...initial,
                sedesIds: [...initial.sedesIds],
            }
            : {
                ...SERVICIO_FORM_INICIAL,
                sedesIds: [],
            }
    );

    const [errors, setErrors] = useState<ServicioFormErrors>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const updateField = useCallback(
        <K extends keyof ServicioFormData>(
            field: K,
            value: ServicioFormData[K]
        ) => {
            setData((prev) => ({
                ...prev,
                [field]: value,
            }));

            setTouched((prev) => ({
                ...prev,
                [field]: true,
            }));
        },
        []
    );

    const toggleSede = useCallback((sedeId: string) => {
        setData((prev) => ({
            ...prev,
            sedesIds: prev.sedesIds.includes(sedeId)
                ? prev.sedesIds.filter((id) => id !== sedeId)
                : [...prev.sedesIds, sedeId],
        }));

        setTouched((prev) => ({
            ...prev,
            sedesIds: true,
        }));
    }, []);

    const selectAllSedes = useCallback((sedesIds: string[]) => {
        setData((prev) => ({
            ...prev,
            sedesIds: [...new Set(sedesIds)],
        }));

        setTouched((prev) => ({
            ...prev,
            sedesIds: true,
        }));
    }, []);

    const getDataToSave = useCallback(
        (sedeActualId: string): ServicioFormData => ({
            ...data,
            nombre: data.nombre.trim(),
            descripcion: data.descripcion.trim(),
            sedesIds: buildServiceSedesIds(
                sedeActualId,
                data.sedesIds
            ),
        }),
        [data]
    );

    const validate = useCallback(
        (sedeActualId: string): boolean => {
            const finalData = getDataToSave(sedeActualId);
            const validationErrors = validateServiceForm(finalData);

            setErrors(validationErrors);

            setTouched(
                Object.keys(finalData).reduce<Record<string, boolean>>(
                    (acc, key) => {
                        acc[key] = true;
                        return acc;
                    },
                    {}
                )
            );

            return !hasServiceErrors(validationErrors);
        },
        [getDataToSave]
    );

    const reset = useCallback((newData?: ServicioFormData) => {
        setData(
            newData
                ? {
                    ...newData,
                    sedesIds: [...newData.sedesIds],
                }
                : {
                    ...SERVICIO_FORM_INICIAL,
                    sedesIds: [],
                }
        );

        setErrors({});
        setTouched({});
    }, []);

    const getFieldError = useCallback(
        (field: keyof ServicioFormErrors): string | undefined => {
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
        toggleSede,
        selectAllSedes,
        getDataToSave,
        validate,
        reset,
        getFieldError,
        setErrors,
    };
};
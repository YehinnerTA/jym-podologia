import {
    ServicioFormData,
    ServicioFormErrors,
} from '../service';

export const validateServiceForm = (
    data: ServicioFormData
): ServicioFormErrors => {
    const errors: ServicioFormErrors = {};

    if (!data.nombre.trim()) {
        errors.nombre = 'El nombre del servicio es obligatorio.';
    } else if (data.nombre.trim().length < 3) {
        errors.nombre = 'Debe tener al menos 3 caracteres.';
    }

    if (!data.categoria) {
        errors.categoria = 'Selecciona una categoría.';
    }

    if (
        !Number.isFinite(data.duracionMin) ||
        !Number.isInteger(data.duracionMin) ||
        data.duracionMin <= 0
    ) {
        errors.duracionMin =
            'Ingresa una duración válida en minutos.';
    }

    if (
        !Number.isFinite(data.precio) ||
        data.precio < 0
    ) {
        errors.precio =
            'El precio debe ser un número mayor o igual a cero.';
    }

    if (
        !Array.isArray(data.sedesIds) ||
        data.sedesIds.length === 0
    ) {
        errors.sedesIds =
            'No se pudo determinar la sede del servicio.';
    } else if (
        new Set(data.sedesIds).size !== data.sedesIds.length
    ) {
        errors.sedesIds =
            'No puede haber sedes duplicadas.';
    }

    return errors;
};

export const hasServiceErrors = (
    errors: ServicioFormErrors
): boolean => {
    return Object.values(errors).some(Boolean);
};

export const buildServiceSedesIds = (
    sedeActualId: string,
    sedesAdicionalesIds: string[] = []
): string[] => {
    if (!sedeActualId.trim()) {
        return [];
    }

    return [
        ...new Set([
            sedeActualId,
            ...sedesAdicionalesIds.filter(Boolean),
        ]),
    ];
};
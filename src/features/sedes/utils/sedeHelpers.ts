import {
    SedeFormData,
    SedeFormErrors,
} from '../sede';

export const DIAS_LABELS: Record<string, string> = {
    lunes: 'Lunes',
    martes: 'Martes',
    miercoles: 'Miércoles',
    jueves: 'Jueves',
    viernes: 'Viernes',
    sabado: 'Sábado',
    domingo: 'Domingo',
};

export const validateSedeForm = (
    data: SedeFormData
): SedeFormErrors => {
    const errors: SedeFormErrors = {};

    // Nombre de la sede
    if (!data.nombre.trim()) {
        errors.nombre = 'El nombre es obligatorio';
    } else if (data.nombre.trim().length < 3) {
        errors.nombre = 'Mínimo 3 caracteres';
    }

    // Dirección
    if (!data.direccion.trim()) {
        errors.direccion = 'La dirección es obligatoria';
    }

    // Teléfono (opcional)
    if (
        data.telefono &&
        !/^[\d\s+()-]{6,}$/.test(data.telefono)
    ) {
        errors.telefono = 'Teléfono inválido';
    }

    // Correo electrónico (opcional)
    if (
        data.email &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)
    ) {
        errors.email = 'Email inválido';
    }

    // Cupos por horario
    if (
        !Number.isInteger(data.cuposPorHorario) ||
        data.cuposPorHorario < 1
    ) {
        errors.cuposPorHorario =
            'Debe haber al menos 1 cupo por horario';
    } else if (data.cuposPorHorario > 20) {
        errors.cuposPorHorario =
            'Máximo 20 cupos por horario';
    }

    // Habitaciones
    if (
        !Number.isInteger(data.habitaciones) ||
        data.habitaciones < 1
    ) {
        errors.habitaciones =
            'Debe haber al menos 1 habitación';
    }

    return errors;
};

export const hasErrors = (
    errors: SedeFormErrors
): boolean => {
    return Object.keys(errors).length > 0;
};
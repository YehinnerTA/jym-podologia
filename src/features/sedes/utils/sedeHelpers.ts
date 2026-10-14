import { SedeFormData, SedeFormErrors } from '../sede';

export const DIAS_LABELS: Record<string, string> = {
    lunes: 'Lunes',
    martes: 'Martes',
    miercoles: 'Miércoles',
    jueves: 'Jueves',
    viernes: 'Viernes',
    sabado: 'Sábado',
    domingo: 'Domingo',
};

export const validateSedeForm = (data: SedeFormData): SedeFormErrors => {
    const errors: SedeFormErrors = {};

    if (!data.nombre.trim()) errors.nombre = 'El nombre es obligatorio';
    else if (data.nombre.trim().length < 3) errors.nombre = 'Mínimo 3 caracteres';

    if (!data.ruc.trim()) errors.ruc = 'El RUC es obligatorio';
    else if (!/^\d{11}$/.test(data.ruc.trim()))
        errors.ruc = 'El RUC debe tener 11 dígitos';

    if (!data.direccion.trim()) errors.direccion = 'La dirección es obligatoria';

    if (data.telefono && !/^[\d\s+()-]{6,}$/.test(data.telefono))
        errors.telefono = 'Teléfono inválido';

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
        errors.email = 'Email inválido';

    if (data.cuposPorHorario < 1) errors.cuposPorHorario = 'Mínimo 1 cupo';
    if (data.cuposPorHorario > 20) errors.cuposPorHorario = 'Máximo 20 cupos';

    if (data.habitaciones < 1) errors.habitaciones = 'Mínimo 1 habitación';

    return errors;
};

export const hasErrors = (errors: SedeFormErrors): boolean =>
    Object.keys(errors).length > 0;
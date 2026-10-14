import { PersonaFormData, PersonaFormErrors, PersonaTipo } from '../person';

export const TIPO_COLORS: Record<PersonaTipo, string> = {
    paciente: '#00a8b5',
    medico: '#0b2545',
    recepcionista: '#ffb703',
    admin: '#e63946',
};

export const TIPO_ICONS: Record<PersonaTipo, string> = {
    paciente: 'fa-solid fa-user',
    medico: 'fa-solid fa-user-doctor',
    recepcionista: 'fa-solid fa-headset',
    admin: 'fa-solid fa-user-shield',
};

export const validatePersonForm = (
    data: PersonaFormData,
    password?: string
): PersonaFormErrors => {
    const errors: PersonaFormErrors = {};

    if (!data.nombre.trim()) errors.nombre = 'El nombre es obligatorio';
    else if (data.nombre.trim().length < 3) errors.nombre = 'Mínimo 3 caracteres';

    if (!data.dni.trim()) errors.dni = 'El DNI es obligatorio';
    else if (!/^\d{8}$/.test(data.dni.trim())) errors.dni = 'El DNI debe tener 8 dígitos';

    if (!data.whatsapp.trim()) errors.whatsapp = 'El WhatsApp es obligatorio';
    else if (!/^[\d\s+()-]{6,}$/.test(data.whatsapp)) errors.whatsapp = 'WhatsApp inválido';

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.email = 'Email inválido';
    }

    if (data.tipo === 'medico') {
        if (!data.especialidad.trim()) errors.especialidad = 'La especialidad es obligatoria';
        if (!data.numeroColegiatura.trim()) {
            errors.numeroColegiatura = 'El N° de colegiatura es obligatorio';
        }
    }

    if (data.esTrabajador) {
        if (!data.username?.trim()) errors.username = 'El usuario es obligatorio';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.username)) {
            errors.username = 'Usuario inválido (debe ser email)';
        }

        if (password !== undefined && password.length < 6) {
            errors.password = 'La contraseña debe tener al menos 6 caracteres';
        }

        if (!data.sedesIds || data.sedesIds.length === 0) {
            errors.sedesIds = 'Selecciona al menos una sede';
        }
    }

    return errors;
};

export const hasErrors = (errors: PersonaFormErrors): boolean =>
    Object.keys(errors).length > 0;

export const getTipoFromTrabajador = (
    tipo: PersonaTipo,
    esTrabajador: boolean
): PersonaTipo => {
    if (!esTrabajador) return 'paciente';
    return tipo === 'paciente' ? 'recepcionista' : tipo;
};
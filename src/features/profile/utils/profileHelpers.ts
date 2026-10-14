import { Persona } from '../../people/person';

export interface PasswordErrors {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
}

export interface CredentialsErrors {
    currentPassword?: string;
    newEmail?: string;
    newPassword?: string;
    confirmPassword?: string;
}

export const validatePasswordForm = (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
): PasswordErrors => {
    const errors: PasswordErrors = {};

    if (!currentPassword) {
        errors.currentPassword = 'Ingresa tu contraseña actual';
    }

    if (!newPassword) {
        errors.newPassword = 'Ingresa la nueva contraseña';
    } else if (newPassword.length < 6) {
        errors.newPassword = 'Mínimo 6 caracteres';
    } else if (newPassword === currentPassword) {
        errors.newPassword = 'La nueva contraseña debe ser diferente';
    }

    if (!confirmPassword) {
        errors.confirmPassword = 'Confirma la nueva contraseña';
    } else if (confirmPassword !== newPassword) {
        errors.confirmPassword = 'Las contraseñas no coinciden';
    }

    return errors;
};

export const validateCredentialsForm = (
    currentPassword: string,
    newEmail: string,
    newPassword: string,
    confirmPassword: string,
    currentEmail: string
): CredentialsErrors => {
    const errors: CredentialsErrors = {};

    if (!currentPassword) {
        errors.currentPassword = 'Ingresa tu contraseña actual';
    }

    if (!newEmail) {
        errors.newEmail = 'Ingresa el nuevo correo';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        errors.newEmail = 'Correo inválido';
    } else if (newEmail === currentEmail) {
        errors.newEmail = 'El correo es el mismo que el actual';
    }

    if (!newPassword) {
        errors.newPassword = 'Ingresa la nueva contraseña';
    } else if (newPassword.length < 6) {
        errors.newPassword = 'Mínimo 6 caracteres';
    }

    if (!confirmPassword) {
        errors.confirmPassword = 'Confirma la nueva contraseña';
    } else if (confirmPassword !== newPassword) {
        errors.confirmPassword = 'Las contraseñas no coinciden';
    }

    return errors;
};

export const hasErrors = (errors: Record<string, unknown>): boolean =>
    Object.keys(errors).length > 0;

// Campos editables por el usuario
export const isFieldEditable = (field: string): boolean => {
    const editable = ['whatsapp', 'email', 'direccion', 'alergias', 'antecedentes', 'notas'];
    return editable.includes(field);
};

// Si el usuario puede ver el tab de credenciales
export const canManageCredentials = (persona: Persona | null): boolean => {
    if (!persona) return false;
    return persona.esTrabajador === true;
};
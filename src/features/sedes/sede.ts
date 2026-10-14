export type DiaSemana =
    | 'lunes'
    | 'martes'
    | 'miercoles'
    | 'jueves'
    | 'viernes'
    | 'sabado'
    | 'domingo';

export interface HorarioDia {
    inicio: string; // HH:mm
    fin: string;    // HH:mm
}

export type HorarioAtencion = {
    [K in DiaSemana]: HorarioDia | null;
};

export interface Sede {
    id: string;
    nombre: string;
    ruc: string;
    direccion: string;
    telefono: string;
    email: string;
    esPredeterminada: boolean;

    cuposPorHorario: number;
    habitaciones: number;
    horarioAtencion: HorarioAtencion;

    activo: boolean;
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string;
}

export type SedeFormData = Omit<Sede, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>;

export interface SedeFormErrors {
    nombre?: string;
    ruc?: string;
    direccion?: string;
    telefono?: string;
    email?: string;
    cuposPorHorario?: string;
    habitaciones?: string;
}

export const HORARIO_DEFAULT: HorarioAtencion = {
    lunes: { inicio: '08:00', fin: '18:00' },
    martes: { inicio: '08:00', fin: '18:00' },
    miercoles: { inicio: '08:00', fin: '18:00' },
    jueves: { inicio: '08:00', fin: '18:00' },
    viernes: { inicio: '08:00', fin: '18:00' },
    sabado: { inicio: '08:00', fin: '14:00' },
    domingo: null,
};

export const SEDE_FORM_INICIAL: SedeFormData = {
    nombre: '',
    ruc: '',
    direccion: '',
    telefono: '',
    email: '',
    esPredeterminada: false,
    cuposPorHorario: 1,
    habitaciones: 1,
    horarioAtencion: HORARIO_DEFAULT,
    activo: true,
};
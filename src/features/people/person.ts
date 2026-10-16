export type PersonaTipo = 'paciente' | 'medico' | 'recepcionista' | 'admin';

export interface Persona {
    id: string;
    tipo: PersonaTipo;

    nombre: string;
    dni: string;
    fechaNacimiento: string;
    genero: 'M' | 'F' | 'otro' | '';
    whatsapp: string;
    email: string;
    direccion: string;
    sedesIds: string[];
    sedeOrigenId?: string | null;

    // Solo médico
    especialidad: string;
    numeroColegiatura: string;

    // Solo paciente
    alergias: string;
    antecedentes: string;
    notas: string;

    // Solo trabajador
    esTrabajador: boolean;
    username?: string;

    authUid?: string | null;
    activo: boolean;
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string;
}

export type PersonaFormData = Omit<
    Persona,
    | 'id'
    | 'authUid'
    | 'createdAt'
    | 'updatedAt'
    | 'createdBy'
    | 'sedeOrigenId'
>;

export interface PersonaFormErrors {
    nombre?: string;
    dni?: string;
    whatsapp?: string;
    email?: string;
    especialidad?: string;
    numeroColegiatura?: string;
    username?: string;
    password?: string;
    sedesIds?: string;
}

export const PERSONA_FORM_INICIAL: PersonaFormData = {
    tipo: 'paciente',
    nombre: '',
    dni: '',
    fechaNacimiento: '',
    genero: '',
    whatsapp: '',
    email: '',
    direccion: '',
    sedesIds: [],
    especialidad: '',
    numeroColegiatura: '',
    alergias: '',
    antecedentes: '',
    notas: '',
    esTrabajador: false,
    username: '',
    activo: true,
};

export const TIPO_LABELS: Record<PersonaTipo, string> = {
    paciente: 'Paciente',
    medico: 'Médico',
    recepcionista: 'Recepcionista',
    admin: 'Administrador',
};
export type CitaEstado =
    | 'pendiente_atencion'
    | 'atendiendo'
    | 'concluida_atencion'
    | 'no_asistio'
    | 'reprogramada'
    | 'cancelada';

export type SeguimientoCitaEstado = 'pendiente' | 'contactado' | 'sin_contacto' | 'reagendado';

export interface CitaIntentoContacto {
    fecha: string;
    medio: 'llamada' | 'whatsapp' | 'otro';
    resultado: 'respondio' | 'sin_respuesta';
    observacion: string;
    registradoPor: string;
}

export interface CitaSeguimientoInasistencia {
    fechaInasistencia: string;
    fechaLimiteContacto: string;
    estado: SeguimientoCitaEstado;
    intentos: CitaIntentoContacto[];
    fechaCierre?: string | null;
}

export interface Cita {
    id: string;
    sedeId: string;
    sedeNombre: string;
    pacienteId: string;
    pacienteNombre: string;
    pacienteWhatsapp: string;
    pacienteDni: string;
    medicoId?: string;
    medicoNombre?: string;
    servicioId: string;
    servicioNombre: string;
    duracionMin: number;
    fechaInicio: string;
    fechaFin: string;
    estado: CitaEstado;
    costo: number;
    anticipoReserva: number;
    saldoPendiente: number;
    numeroSesion: number;
    totalSesiones: number | null;
    confirmada: boolean;
    motivoCancelacion?: string | null;
    reprogramadaDesde?: string | null;
    reprogramadaHacia?: string | null;
    fechaReprogramadaPara?: string | null;
    motivoReprogramacion?: string | null;
    fechaReprogramacion?: string | null;
    seguimientoInasistencia?: CitaSeguimientoInasistencia | null;
    notas: string;
    observaciones: string;
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string;
    atencionIniciadaPor?: string;
    atencionIniciadaEn?: string;
}

export interface CitaFormData {
    sedeId: string;
    pacienteId: string;
    pacienteNombre: string;
    pacienteWhatsapp: string;
    pacienteDni: string;
    medicoId: string;
    medicoNombre: string;
    servicioId: string;
    servicioNombre: string;
    duracionMin: number;
    fechaInicio: string;
    fechaFin: string;
    costo: number;
    anticipoReserva: number;
    saldoPendiente: number;
    numeroSesion: number;
    totalSesiones: number | null;
    notas: string;
    observaciones: string;
}

export const CITA_ESTADO_LABELS: Record<CitaEstado, string> = {
    pendiente_atencion: 'Pendiente',
    atendiendo: 'Atendiendo',
    concluida_atencion: 'Concluida',
    no_asistio: 'No asistió',
    reprogramada: 'Reprogramada',
    cancelada: 'Cancelada',
};
export const CITA_ESTADO_ICONS: Record<CitaEstado, string> = {
    pendiente_atencion: 'fa-solid fa-clock',
    atendiendo: 'fa-solid fa-user-doctor',
    concluida_atencion: 'fa-solid fa-circle-check',
    no_asistio: 'fa-solid fa-user-xmark',
    reprogramada: 'fa-solid fa-calendar-plus',
    cancelada: 'fa-solid fa-circle-xmark',
};
export const CITA_ESTADO_COLORS: Record<CitaEstado, string> = {
    pendiente_atencion: '#94a3b8',
    atendiendo: '#00a8b5',
    concluida_atencion: '#06a77d',
    no_asistio: '#ffb703',
    reprogramada: '#0b2545',
    cancelada: '#e63946',
};
export interface Notificacion {
    id: string;
    tipo: 'cita_pendiente' | 'cita_cancelada' | 'cita_confirmada' | 'paciente_nuevo';
    mensaje: string;
    fecha: string;
    leido: boolean;
    citaId?: string;
}

export interface NavLink {
    name: string;
    path: string;
    icon: string;
}
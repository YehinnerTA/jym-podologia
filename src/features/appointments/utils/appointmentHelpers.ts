import { CitaEstado } from '../appointment';

export const formatHora = (iso: string): string => {
    const d = new Date(iso);
    return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
};

export const formatFecha = (iso: string): string => {
    const d = new Date(iso);
    return d.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

export const formatFechaHora = (iso: string): string => {
    return `${formatFecha(iso)} · ${formatHora(iso)}`;
};

export const formatRango = (inicio: string, fin: string): string => {
    return `${formatHora(inicio)} – ${formatHora(fin)}`;
};

export const getFechaInicioDia = (fecha: Date = new Date()): Date => {
    const d = new Date(fecha);
    d.setHours(0, 0, 0, 0);
    return d;
};

export const getFechaFinDia = (fecha: Date = new Date()): Date => {
    const d = new Date(fecha);
    d.setHours(23, 59, 59, 999);
    return d;
};

export const getRangoSemana = (): { inicio: Date; fin: Date } => {
    const hoy = new Date();
    const dia = hoy.getDay();
    const diff = hoy.getDate() - dia + (dia === 0 ? -6 : 1);
    const inicio = new Date(hoy.setDate(diff));
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date(inicio);
    fin.setDate(inicio.getDate() + 6);
    fin.setHours(23, 59, 59, 999);
    return { inicio, fin };
};

export const getRangoMes = (): { inicio: Date; fin: Date } => {
    const hoy = new Date();
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59, 999);
    return { inicio, fin };
};

export const estadosFinales: CitaEstado[] = [
    'concluida_atencion',
    'no_asistio',
    'reprogramada',
    'cancelada',
];

export const isEstadoFinal = (estado: CitaEstado): boolean => {
    return estadosFinales.includes(estado);
};
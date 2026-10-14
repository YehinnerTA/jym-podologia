import { useState, useCallback } from 'react';
import { Notificacion } from '../header';

const NOTIFICACIONES_DEMO: Notificacion[] = [
    {
        id: '1',
        tipo: 'cita_pendiente',
        mensaje: 'Tienes 3 citas pendientes hoy',
        fecha: new Date().toISOString(),
        leido: false,
    },
    {
        id: '2',
        tipo: 'cita_cancelada',
        mensaje: 'Cita de Juan Pérez cancelada (10:00)',
        fecha: new Date(Date.now() - 3600000).toISOString(),
        leido: false,
    },
    {
        id: '3',
        tipo: 'cita_confirmada',
        mensaje: 'María Díaz confirmó su cita',
        fecha: new Date(Date.now() - 7200000).toISOString(),
        leido: true,
    },
];

export const useHeaderNotifications = () => {
    const [notificaciones, setNotificaciones] = useState<Notificacion[]>(NOTIFICACIONES_DEMO);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const noLeidas = notificaciones.filter(n => !n.leido).length;

    const openModal = useCallback(() => setIsModalOpen(true), []);
    const closeModal = useCallback(() => setIsModalOpen(false), []);

    const marcarComoLeida = useCallback((id: string) => {
        setNotificaciones(prev =>
            prev.map(n => (n.id === id ? { ...n, leido: true } : n))
        );
    }, []);

    const marcarTodasComoLeidas = useCallback(() => {
        setNotificaciones(prev => prev.map(n => ({ ...n, leido: true })));
    }, []);

    return {
        notificaciones,
        noLeidas,
        isModalOpen,
        openModal,
        closeModal,
        marcarComoLeida,
        marcarTodasComoLeidas,
    };
};
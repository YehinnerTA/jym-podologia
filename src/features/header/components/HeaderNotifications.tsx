import React from 'react';
import { AppModal } from '../../../components/Modal/AppModal';
import { AppButton } from '../../../components';
import { Notificacion } from '../header';

interface Props {
    notificaciones: Notificacion[];
    noLeidas: number;
    isModalOpen: boolean;
    onOpen: () => void;
    onClose: () => void;
    onMarcarLeida: (id: string) => void;
    onMarcarTodas: () => void;
}

const ICONOS: Record<string, { icon: string; color: string }> = {
    cita_pendiente: { icon: 'fa-solid fa-clock', color: 'var(--color-advertencia)' },
    cita_cancelada: { icon: 'fa-solid fa-circle-xmark', color: 'var(--color-peligro)' },
    cita_confirmada: { icon: 'fa-solid fa-circle-check', color: 'var(--color-exito)' },
    paciente_nuevo: { icon: 'fa-solid fa-user-plus', color: 'var(--color-secundario)' },
};

export const HeaderNotifications: React.FC<Props> = ({
    notificaciones,
    noLeidas,
    isModalOpen,
    onOpen,
    onClose,
    onMarcarLeida,
    onMarcarTodas,
}) => {
    return (
        <>
            <button
                type="button"
                className="jym-notif-btn"
                onClick={onOpen}
                aria-label={`Notificaciones (${noLeidas} sin leer)`}
            >
                <i className="fa-solid fa-bell"></i>
                {noLeidas > 0 && <span className="jym-notif-badge">{noLeidas}</span>}
            </button>

            <AppModal
                isOpen={isModalOpen}
                onClose={onClose}
                title="Notificaciones"
                icon="fa-solid fa-bell"
                footer={
                    <div className="jym-notif-footer">
                        <AppButton
                            variant="secondary"
                            size="sm"
                            onClick={onMarcarTodas}
                            disabled={noLeidas === 0}
                            icon="fa-solid fa-check-double"
                        >
                            Marcar todas como leídas
                        </AppButton>
                        <AppButton variant="ghost" size="sm" onClick={onClose} icon="fa-solid fa-times">
                            Cerrar
                        </AppButton>
                    </div>
                }
            >
                {notificaciones.length === 0 ? (
                    <div className="jym-notif-empty">
                        <i className="fa-solid fa-check-circle"></i>
                        <p>No tienes notificaciones pendientes</p>
                    </div>
                ) : (
                    <ul className="jym-notif-list">
                        {notificaciones.map(notif => {
                            const config = ICONOS[notif.tipo] || ICONOS.cita_pendiente;
                            return (
                                <li
                                    key={notif.id}
                                    className={`jym-notif-item ${notif.leido ? 'leido' : ''}`}
                                    onClick={() => !notif.leido && onMarcarLeida(notif.id)}
                                >
                                    <span className="jym-notif-icon" style={{ color: config.color }}>
                                        <i className={config.icon}></i>
                                    </span>
                                    <div className="jym-notif-content">
                                        <p className="jym-notif-message">{notif.mensaje}</p>
                                        <span className="jym-notif-date">
                                            <i className="fa-regular fa-clock"></i>{' '}
                                            {new Date(notif.fecha).toLocaleString('es-PE', {
                                                day: '2-digit',
                                                month: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </span>
                                    </div>
                                    {!notif.leido && <span className="jym-notif-dot"></span>}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </AppModal>
        </>
    );
};
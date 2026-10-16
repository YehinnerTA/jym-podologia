import React, { useEffect, useMemo, useRef, useState } from 'react';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db } from '../../../config/firebase';

import {
    AppButton,
    AppCard,
    AppPagination,
    AppEmptyState,
    AppLoader,
    AppConfirmDialog,
    AppModal,
} from '../../../components';

import { useAppointments } from '../hooks/useAppointments';
import { useAppointmentFilters } from '../hooks/useAppointmentFilters';
import { useCompany } from '../../company/context/CompanyContext';
import { Cita, CitaEstado, CitaFormData, CitaIntentoContacto } from '../appointment';
import { appointmentService, type ReservaTemporal, type HorarioDisponible } from '../services/appointmentService';
import {
    formatFechaHora,
    formatRango,
} from '../utils/appointmentHelpers';

import { AppointmentFilters } from './AppointmentFilters';
import { AppointmentTable } from './AppointmentTable';
import { AppointmentCard } from './AppointmentCard';
import { AppointmentForm } from './AppointmentForm';
import { AppointmentStatusBadge } from './AppointmentStatusBadge';

import '../appointments.css';

type AccionEstado = 'atendiendo' | 'concluida_atencion' | 'no_asistio';

const ESTADOS_FINALES: CitaEstado[] = [
    'concluida_atencion',
    'no_asistio',
    'reprogramada',
    'cancelada',
];

const esFinal = (estado: CitaEstado): boolean =>
    ESTADOS_FINALES.includes(estado);

const fechaLocal = (d: Date): string => {
    const dos = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}T${dos(d.getHours())}:${dos(d.getMinutes())}`;
};

const SLOT_MS = 5 * 60_000;
const MENSAJE_TEMPORAL = 'Este horario tiene un registro temporal en proceso. Selecciona otro horario para continuar.';

interface BloqueoAgenda {
    id: string;
    tipo?: string;
    holdId?: string;
    ownerUid?: string;
}

interface IntervaloAgenda {
    inicio: number;
    fin: number;
    tipo: 'registrada' | 'temporal';
}

type EvaluacionReagendar =
    | { tipo: 'libre'; horario: HorarioDisponible }
    | { tipo: 'temporal' | 'sin_espacio'; mensaje: string }
    | { tipo: 'incompleta' };

const horariosIguales = (a: ReservaTemporal, b: ReservaTemporal): boolean =>
    a.sedeId === b.sedeId && a.medicoId === b.medicoId &&
    a.fechaInicio === b.fechaInicio && a.fechaFin === b.fechaFin;

const coincidenIntervalos = (
    a: { inicio: number; fin: number },
    b: { inicio: number; fin: number }
): boolean => a.inicio < b.fin && a.fin > b.inicio;

const textoHora = (ms: number): string =>
    new Date(ms).toLocaleTimeString('es-PE', {
        hour: 'numeric', minute: '2-digit', hour12: true,
    });

const moneda = (valor: number): string =>
    `S/ ${Number(valor || 0).toFixed(2)}`;

const DETALLE_ESTILO: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
    gap: '0.9rem',
};

const CAMBIOS: Record<AccionEstado, {
    titulo: string;
    mensaje: string;
    confirmar: string;
}> = {
    atendiendo: {
        titulo: 'Iniciar atención',
        mensaje: '¿Confirmas que el paciente llegó y que comenzará su atención?',
        confirmar: 'Iniciar atención',
    },
    concluida_atencion: {
        titulo: 'Concluir atención',
        mensaje: '¿Confirmas que la atención del paciente ha finalizado?',
        confirmar: 'Concluir atención',
    },
    no_asistio: {
        titulo: 'Registrar inasistencia',
        mensaje: '¿Confirmas que el paciente no asistió? La cita quedará en el historial y este estado no se podrá revertir desde este módulo.',
        confirmar: 'Marcar no asistió',
    },
};

export const AppointmentList: React.FC = () => {
    const filters = useAppointmentFilters();
    const { selectedSede, sedes } = useCompany();

    const {
        citas,
        totalCitas,
        isLoading,
        error,
        currentPage,
        totalPages,
        itemsPerPage,
        setCurrentPage,
    } = useAppointments({
        search: filters.search,
        estadoFilter: filters.estadoFilter,
        fechaRango: filters.fechaRango,
        medicoFilter: filters.medicoFilter,
        servicioFilter: filters.servicioFilter,
    });

    const [formOpen, setFormOpen] = useState(false);
    const [editingCita, setEditingCita] = useState<Cita | null>(null);
    const [detailCita, setDetailCita] = useState<Cita | null>(null);
    const [cancelTarget, setCancelTarget] = useState<Cita | null>(null);
    const [estadoTarget, setEstadoTarget] = useState<{
        cita: Cita;
        estado: AccionEstado;
    } | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [isChangingStatus, setIsChangingStatus] = useState(false);
    const [actionError, setActionError] = useState('');
    const [atencionActivaId, setAtencionActivaId] = useState<string | null>(null);
    const [ahoraAdministrativo, setAhoraAdministrativo] = useState(Date.now());
    useEffect(() => {
        const reloj = window.setInterval(() => setAhoraAdministrativo(Date.now()), 60_000);
        return () => window.clearInterval(reloj);
    }, []);
    const vencidaSinGestionar = (cita: Cita): boolean => {
        if (cita.estado !== 'pendiente_atencion') return false;
        const fecha = new Date(cita.fechaInicio);
        if (!Number.isFinite(fecha.getTime())) return false;
        return ahoraAdministrativo >= new Date(
            fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + 1
        ).getTime();
    };


    useEffect(() => {
        if (!selectedSede || !auth.currentUser) return;
        const uid = auth.currentUser.uid;
        return onSnapshot(
            query(collection(db, 'citas'), where('sedeId', '==', selectedSede)),
            snapshot => {
                const activas = snapshot.docs
                    .map(d => ({ ...d.data(), id: d.id } as Cita))
                    .filter(c => c.estado === 'atendiendo' && c.atencionIniciadaPor === uid);
                const activa = activas[0];
                if (!activa) {
                    setAtencionActivaId(null);
                    return;
                }
                setAtencionActivaId(activa.id);
                setDetailCita(anterior => {
                    if (anterior?.id === activa.id && anterior.estado === activa.estado) return anterior;
                    return activa;
                });
            },
            err => console.error('No se pudo recuperar la atención activa:', err)
        );
    }, [selectedSede]);
    const [editHist, setEditHist] = useState<Cita | null>(null);
    const [histWhatsapp, setHistWhatsapp] = useState('');
    const [histNotas, setHistNotas] = useState('');
    const [histObservaciones, setHistObservaciones] = useState('');
    const [histCosto, setHistCosto] = useState('0');
    const [histAnticipo, setHistAnticipo] = useState('0');
    const [histGuardando, setHistGuardando] = useState(false);
    const [histError, setHistError] = useState('');
    const [historial, setHistorial] = useState<Cita[]>([]);
    const [historialCargando, setHistorialCargando] = useState(false);

    const [contactoCita, setContactoCita] = useState<Cita | null>(null);
    const [contactoMedio, setContactoMedio] = useState<CitaIntentoContacto['medio']>('whatsapp');
    const [contactoResultado, setContactoResultado] = useState<CitaIntentoContacto['resultado']>('sin_respuesta');
    const [contactoObservacion, setContactoObservacion] = useState('');
    const [contactoGuardando, setContactoGuardando] = useState(false);
    const [contactoError, setContactoError] = useState('');
    const [cerrandoSeguimientoId, setCerrandoSeguimientoId] = useState<string | null>(null);

    const abrirContacto = (cita: Cita) => {
        setDetailCita(null);
        setContactoMedio('whatsapp');
        setContactoResultado('sin_respuesta');
        setContactoObservacion('');
        setContactoError('');
        setContactoCita(cita);
    };

    const guardarContacto = async () => {
        if (!contactoCita || contactoGuardando) return;
        setContactoGuardando(true);
        setContactoError('');
        try {
            await appointmentService.registrarIntentoContacto(
                contactoCita.id,
                contactoMedio,
                contactoResultado,
                contactoObservacion
            );
            setContactoCita(null);
        } catch (err) {
            setContactoError(err instanceof Error ? err.message : 'No fue posible registrar el contacto.');
        } finally {
            setContactoGuardando(false);
        }
    };

    const cerrarSeguimiento = async (cita: Cita) => {
        if (cerrandoSeguimientoId) return;
        setCerrandoSeguimientoId(cita.id);
        setActionError('');
        try {
            await appointmentService.cerrarSeguimientoSinContacto(cita.id);
            setDetailCita(null);
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'No se pudo cerrar el seguimiento.');
        } finally {
            setCerrandoSeguimientoId(null);
        }
    };

    const detalleVigente = detailCita
        ? citas.find((cita) => cita.id === detailCita.id) || detailCita
        : null;


    useEffect(() => {
        if (!detailCita) {
            setHistorial([]);
            setHistorialCargando(false);
            return;
        }
        let cancelado = false;
        setHistorial([]);
        setHistorialCargando(true);
        const cargar = async () => {
            const conocidos = new Map<string, Cita>();
            const pendientes = [detailCita.id];
            try {
                while (pendientes.length && conocidos.size < 30) {
                    const id = pendientes.shift()!;
                    if (conocidos.has(id)) continue;
                    const registro = id === detailCita.id
                        ? await appointmentService.getById(id) || detailCita
                        : await appointmentService.getById(id);
                    if (!registro) continue;
                    conocidos.set(id, registro);
                    if (registro.reprogramadaDesde && !conocidos.has(registro.reprogramadaDesde))
                        pendientes.push(registro.reprogramadaDesde);
                    if (registro.reprogramadaHacia && !conocidos.has(registro.reprogramadaHacia))
                        pendientes.push(registro.reprogramadaHacia);
                }
                if (!cancelado) {
                    const registros = [...conocidos.values()];
                    const porId = new Map(registros.map(r => [r.id, r]));
                    const raiz = registros.find(r => !r.reprogramadaDesde ||
                        !porId.has(r.reprogramadaDesde)) || registros[0];
                    const ordenados: Cita[] = [];
                    const visitados = new Set<string>();
                    let cursor: Cita | undefined = raiz;
                    while (cursor && !visitados.has(cursor.id)) {
                        ordenados.push(cursor);
                        visitados.add(cursor.id);
                        cursor = cursor.reprogramadaHacia
                            ? porId.get(cursor.reprogramadaHacia) : undefined;
                    }
                    for (const registro of registros) {
                        if (!visitados.has(registro.id)) ordenados.push(registro);
                    }
                    setHistorial(ordenados);
                }
            } catch (err) {
                if (!cancelado) setActionError(err instanceof Error ? err.message :
                    'No se pudo consultar el historial de franjas.');
            } finally {
                if (!cancelado) setHistorialCargando(false);
            }
        };
        void cargar();
        return () => { cancelado = true; };
    }, [detailCita?.id, detailCita?.reprogramadaDesde, detailCita?.reprogramadaHacia]);

    const abrirEdicionHistorica = (cita: Cita) => {
        setHistWhatsapp(cita.pacienteWhatsapp || '');
        setHistNotas(cita.notas || '');
        setHistObservaciones(cita.observaciones || '');
        setHistCosto(String(cita.costo));
        setHistAnticipo(String(cita.anticipoReserva));
        setHistError('');
        setDetailCita(null);
        setEditHist(cita);
    };

    const guardarEdicionHistorica = async () => {
        if (!editHist || histGuardando) return;
        setHistGuardando(true);
        setHistError('');
        try {
            await appointmentService.actualizarDatosAdministrativos(editHist.id, {
                pacienteWhatsapp: histWhatsapp,
                notas: histNotas,
                observaciones: histObservaciones,
                costo: Number(histCosto),
                anticipoReserva: Number(histAnticipo),
            });
            setEditHist(null);
        } catch (err) {
            setHistError(err instanceof Error ? err.message : 'No se pudo actualizar la cita.');
        } finally { setHistGuardando(false); }
    };

    const [reagendarCita, setReagendarCita] = useState<Cita | null>(null);
    const [reagendarFecha, setReagendarFecha] = useState('');
    const [reagendarMotivo, setReagendarMotivo] = useState('');
    const [reagendarError, setReagendarError] = useState('');
    const [reagendarGuardando, setReagendarGuardando] = useState(false);
    const [reagendarReservando, setReagendarReservando] = useState(false);
    const [reservaReagendar, setReservaReagendar] = useState<ReservaTemporal | null>(null);
    const [agendaCitas, setAgendaCitas] = useState<Cita[]>([]);
    const [agendaBloqueos, setAgendaBloqueos] = useState<BloqueoAgenda[]>([]);
    const [agendaCitasLista, setAgendaCitasLista] = useState(false);
    const [agendaBloqueosLista, setAgendaBloqueosLista] = useState(false);
    const [agendaError, setAgendaError] = useState('');
    const [ahoraReagendar, setAhoraReagendar] = useState(Date.now());
    const reagendarHoldId = useRef('');
    const reagendarReservaRef = useRef<ReservaTemporal | null>(null);
    const reagendarColaRef = useRef<Promise<void>>(Promise.resolve());
    const reagendarSesionRef = useRef(0);
    const reagendarSolicitudRef = useRef(0);
    const reagendarConfirmandoRef = useRef(false);

    const cerrarReagendamiento = () => {
        if (reagendarConfirmandoRef.current) return;
        const anteriorHoldId = reagendarHoldId.current;
        const colaAnterior = reagendarColaRef.current;
        reagendarSesionRef.current += 1;
        reagendarSolicitudRef.current += 1;
        setReagendarCita(null);
        setReservaReagendar(null);
        setReagendarError('');
        setReagendarReservando(false);
        void colaAnterior.catch(() => undefined).then(async () => {
            const ultimaReserva = reagendarReservaRef.current;
            if (ultimaReserva) {
                await appointmentService.liberarReservaTemporal(ultimaReserva, anteriorHoldId);
                if (reagendarHoldId.current === anteriorHoldId) {
                    reagendarReservaRef.current = null;
                }
            }
        }).catch(error => console.error('Error liberando reserva de reagendamiento:', error));
    };

    const abrirCitaVigente = async (cita: Cita): Promise<void> => {
        setActionError('');
        try {
            let actual = cita;
            const visitados = new Set<string>([actual.id]);
            for (let i = 0; i < 30 && actual.reprogramadaHacia; i++) {
                const siguienteId = actual.reprogramadaHacia;
                if (visitados.has(siguienteId)) throw new Error('Se detectó un ciclo en el historial de reagendamientos.');
                visitados.add(siguienteId);
                const siguiente = await appointmentService.getById(siguienteId);
                if (!siguiente) throw new Error('No se encontró la cita sucesora.');
                actual = siguiente;
            }
            setDetailCita(actual);
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'No se pudo consultar la cita vigente.');
        }
    };

    const abrirReagendamiento = (cita: Cita) => {
        if (cita.reprogramadaHacia) {
            void abrirCitaVigente(cita);
            return;
        }
        if (!['pendiente_atencion', 'no_asistio'].includes(cita.estado)) {
            setActionError('Solo se puede reagendar una cita pendiente o con inasistencia.');
            return;
        }
        if (!cita.medicoId) {
            setActionError('Esta cita no tiene profesional asignado. Asígnalo antes de reagendar.');
            return;
        }
        if (cita.sedeId !== selectedSede) {
            setActionError('Selecciona la sede original de la cita para reagendar.');
            return;
        }
        setDetailCita(null);
        setActionError('');
        setReagendarError('');
        setAgendaError('');
        setReagendarFecha('');
        setReagendarMotivo('');
        setReservaReagendar(null);
        setReagendarReservando(false);
        setAgendaCitasLista(false);
        setAgendaBloqueosLista(false);
        reagendarReservaRef.current = null;
        reagendarColaRef.current = Promise.resolve();
        reagendarSesionRef.current += 1;
        reagendarSolicitudRef.current += 1;
        reagendarHoldId.current = doc(collection(db, 'cita_bloqueos')).id;
        setAhoraReagendar(Date.now());
        setReagendarCita(cita);
    };

    useEffect(() => {
        if (!reagendarCita?.medicoId) {
            setAgendaCitas([]);
            setAgendaBloqueos([]);
            setAgendaCitasLista(false);
            setAgendaBloqueosLista(false);
            return;
        }
        setAgendaCitasLista(false);
        setAgendaBloqueosLista(false);
        setAgendaError('');
        const stopCitas = onSnapshot(
            query(collection(db, 'citas'),
                where('sedeId', '==', reagendarCita.sedeId),
                where('medicoId', '==', reagendarCita.medicoId)),
            snap => {
                setAgendaCitas(snap.docs.map(d => ({ ...d.data(), id: d.id } as Cita)));
                setAgendaCitasLista(true);
            },
            err => {
                console.error(err);
                setAgendaCitasLista(false);
                setAgendaError('No se pudieron consultar las citas del profesional.');
            }
        );
        const stopBloqueos = onSnapshot(
            query(collection(db, 'cita_bloqueos'),
                where('sedeId', '==', reagendarCita.sedeId),
                where('medicoId', '==', reagendarCita.medicoId)),
            snap => {
                setAgendaBloqueos(snap.docs.map(d => ({ ...d.data(), id: d.id } as BloqueoAgenda)));
                setAgendaBloqueosLista(true);
            },
            err => {
                console.error(err);
                setAgendaBloqueosLista(false);
                setAgendaError('No se pudieron consultar los bloqueos temporales.');
            }
        );
        return () => { stopCitas(); stopBloqueos(); };
    }, [reagendarCita?.sedeId, reagendarCita?.medicoId, reagendarCita?.id]);

    useEffect(() => {
        if (!reagendarCita) return;
        const id = window.setInterval(() => setAhoraReagendar(Date.now()), 5000);
        return () => window.clearInterval(id);
    }, [reagendarCita?.id]);

    const intervalosReagendar = useMemo<IntervaloAgenda[]>(() => {
        const intervalos: IntervaloAgenda[] = [];
        for (const cita of agendaCitas) {
            if (!['pendiente_atencion', 'atendiendo'].includes(cita.estado)) continue;
            const inicio = Date.parse(cita.fechaInicio);
            const fin = Date.parse(cita.fechaFin);
            if (Number.isFinite(inicio) && Number.isFinite(fin) && fin > inicio) {
                intervalos.push({ inicio, fin, tipo: 'registrada' });
            }
        }
        for (const bloqueo of agendaBloqueos) {
            if (bloqueo.tipo !== 'temporal') continue;
            if (bloqueo.holdId === reagendarHoldId.current &&
                bloqueo.ownerUid === auth.currentUser?.uid) continue;
            const indice = Number(bloqueo.id.split('__').pop());
            if (!Number.isInteger(indice)) continue;
            const inicio = indice * SLOT_MS;
            intervalos.push({ inicio, fin: inicio + SLOT_MS, tipo: 'temporal' });
        }
        return intervalos;
    }, [agendaCitas, agendaBloqueos, reagendarCita?.id]);

    const inicioReagendar = reagendarFecha ? new Date(reagendarFecha).getTime() : NaN;
    const fechaReagendarValida = Number.isFinite(inicioReagendar);
    const agendaLista = Boolean(reagendarCita && agendaCitasLista && agendaBloqueosLista && !agendaError);

    const evaluacionReagendar = useMemo<EvaluacionReagendar>(() => {
        if (!reagendarCita?.medicoId || !fechaReagendarValida || !agendaLista ||
            !Number.isInteger(reagendarCita.duracionMin) ||
            reagendarCita.duracionMin < 1 || reagendarCita.duracionMin > 360) {
            return { tipo: 'incompleta' };
        }
        if (inicioReagendar <= ahoraReagendar) {
            return { tipo: 'sin_espacio', mensaje: 'La fecha y hora seleccionadas ya pasaron. Elige una hora posterior.' };
        }
        const fecha = new Date(inicioReagendar);
        const finDia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + 1).getTime();
        const inicioRedondeado = Math.ceil(inicioReagendar / SLOT_MS) * SLOT_MS;
        const registrados = intervalosReagendar.filter(i => i.tipo === 'registrada');
        const temporales = intervalosReagendar.filter(i => i.tipo === 'temporal');
        for (let inicio = inicioRedondeado; inicio <= inicioRedondeado + 12 * 60 * 60_000; inicio += SLOT_MS) {
            const fin = inicio + reagendarCita.duracionMin * 60_000;
            if (fin > finDia) break;
            const candidato = { inicio, fin };
            if (temporales.some(i => coincidenIntervalos(candidato, i))) {
                return { tipo: 'temporal', mensaje: MENSAJE_TEMPORAL };
            }
            if (!registrados.some(i => coincidenIntervalos(candidato, i))) {
                return {
                    tipo: 'libre',
                    horario: {
                        fechaInicio: new Date(inicio).toISOString(),
                        fechaFin: new Date(fin).toISOString(),
                        fueReubicado: inicio !== inicioReagendar,
                    },
                };
            }
        }
        return { tipo: 'sin_espacio', mensaje: 'No existe un espacio continuo disponible para la duración solicitada en esta fecha.' };
    }, [reagendarCita?.id, reagendarCita?.medicoId, reagendarCita?.duracionMin,
        fechaReagendarValida, agendaLista, inicioReagendar, ahoraReagendar, intervalosReagendar]);

    const horarioReagendar = evaluacionReagendar.tipo === 'libre' ? evaluacionReagendar.horario : null;
    const claveReagendar = horarioReagendar && reagendarCita
        ? `${reagendarCita.sedeId}|${reagendarCita.medicoId}|${horarioReagendar.fechaInicio}|${horarioReagendar.fechaFin}`
        : '';

    useEffect(() => {
        if (!reagendarCita || reagendarConfirmandoRef.current) return;
        if (evaluacionReagendar.tipo === 'incompleta' && !reagendarReservaRef.current) return;
        const solicitud = ++reagendarSolicitudRef.current;
        const sesion = reagendarSesionRef.current;
        const holdId = reagendarHoldId.current;
        const uid = auth.currentUser?.uid;
        const siguiente: ReservaTemporal | null = horarioReagendar && reagendarCita.medicoId
            ? {
                sedeId: reagendarCita.sedeId,
                medicoId: reagendarCita.medicoId,
                fechaInicio: horarioReagendar.fechaInicio,
                fechaFin: horarioReagendar.fechaFin,
            } : null;
        if (siguiente && reagendarReservaRef.current && horariosIguales(reagendarReservaRef.current, siguiente)) {
            setReservaReagendar(reagendarReservaRef.current);
            return;
        }
        const timer = window.setTimeout(() => {
            if (sesion !== reagendarSesionRef.current || solicitud !== reagendarSolicitudRef.current) return;
            setReagendarReservando(true);
            const tarea = reagendarColaRef.current.catch(() => undefined).then(async () => {
                if (sesion !== reagendarSesionRef.current) return;
                const anterior = reagendarReservaRef.current;
                if (!siguiente) {
                    if (anterior) {
                        await appointmentService.liberarReservaTemporal(anterior, holdId);
                        reagendarReservaRef.current = null;
                    }
                    if (solicitud === reagendarSolicitudRef.current) setReservaReagendar(null);
                    return;
                }
                if (!uid) throw new Error('Inicia sesión para reservar el nuevo horario.');
                await appointmentService.actualizarReservaTemporal(anterior, siguiente, holdId, uid);
                reagendarReservaRef.current = siguiente;
                if (solicitud === reagendarSolicitudRef.current) {
                    setReservaReagendar(siguiente);
                    setReagendarError('');
                }
            });
            reagendarColaRef.current = tarea;
            void tarea.catch(err => {
                if (sesion === reagendarSesionRef.current && solicitud === reagendarSolicitudRef.current) {
                    setReagendarError(err instanceof Error ? err.message : 'No se pudo bloquear el horario.');
                }
            }).finally(() => {
                if (sesion === reagendarSesionRef.current && solicitud === reagendarSolicitudRef.current) {
                    setReagendarReservando(false);
                }
            });
        }, 300);
        return () => window.clearTimeout(timer);
    }, [reagendarCita?.id, claveReagendar, evaluacionReagendar.tipo]);

    const regletaReagendar = useMemo(() => {
        const referencia = fechaReagendarValida ? new Date(inicioReagendar) : new Date(ahoraReagendar);
        const base = fechaReagendarValida
            ? new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate(), referencia.getHours(), 0).getTime()
            : new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate(), 8, 0).getTime();
        const finCandidato = horarioReagendar ? Date.parse(horarioReagendar.fechaFin) : base + 2 * 60 * 60_000;
        const fin = fechaReagendarValida
            ? Math.ceil(Math.max(base + 2 * 60 * 60_000, finCandidato + 15 * 60_000) / 3_600_000) * 3_600_000
            : base + 4 * 60 * 60_000;
        const minutosTotales = Math.round((fin - base) / 60_000);
        return { base, fin, minutosTotales, ancho: Math.max(720, Math.ceil(minutosTotales / 60) * 330) };
    }, [fechaReagendarValida, inicioReagendar, horarioReagendar?.fechaFin]);

    const desdePxReagendar = (ms: number): number =>
        (ms - regletaReagendar.base) / (regletaReagendar.fin - regletaReagendar.base) * regletaReagendar.ancho;
    const reservaPropiaReagendar = Boolean(reservaReagendar && horarioReagendar && reagendarCita &&
        horariosIguales(reservaReagendar, {
            sedeId: reagendarCita.sedeId, medicoId: reagendarCita.medicoId || '',
            fechaInicio: horarioReagendar.fechaInicio, fechaFin: horarioReagendar.fechaFin,
        }));

    const confirmarReagendamiento = async () => {
        if (!reagendarCita || reagendarConfirmandoRef.current) return;
        reagendarConfirmandoRef.current = true;
        setReagendarGuardando(true);
        setReagendarError('');
        try {
            await reagendarColaRef.current;
            const reserva = reagendarReservaRef.current;
            if (!reserva || !horarioReagendar ||
                reserva.fechaInicio !== horarioReagendar.fechaInicio ||
                reserva.fechaFin !== horarioReagendar.fechaFin) {
                throw new Error('Espera a que se reserve el horario seleccionado.');
            }
            if (!reagendarMotivo.trim()) throw new Error('Indica el motivo del reagendamiento.');
            const datos: CitaFormData = {
                sedeId: reagendarCita.sedeId,
                pacienteId: reagendarCita.pacienteId,
                pacienteNombre: reagendarCita.pacienteNombre,
                pacienteWhatsapp: reagendarCita.pacienteWhatsapp,
                pacienteDni: reagendarCita.pacienteDni,
                medicoId: reagendarCita.medicoId || '',
                medicoNombre: reagendarCita.medicoNombre || '',
                servicioId: reagendarCita.servicioId,
                servicioNombre: reagendarCita.servicioNombre,
                duracionMin: reagendarCita.duracionMin,
                fechaInicio: reserva.fechaInicio,
                fechaFin: reserva.fechaFin,
                costo: reagendarCita.costo,
                anticipoReserva: reagendarCita.anticipoReserva,
                saldoPendiente: reagendarCita.saldoPendiente,
                numeroSesion: reagendarCita.numeroSesion,
                totalSesiones: reagendarCita.totalSesiones,
                notas: reagendarCita.notas,
                observaciones: reagendarCita.observaciones,
            };
            await appointmentService.reagendar(reagendarCita.id, datos, reagendarHoldId.current, reagendarMotivo);
            reagendarReservaRef.current = null;
            setReservaReagendar(null);
            reagendarSesionRef.current += 1;
            setReagendarCita(null);
        } catch (error) {
            setReagendarError(error instanceof Error ? error.message : 'No se pudo reagendar la cita.');
        } finally {
            reagendarConfirmandoRef.current = false;
            setReagendarGuardando(false);
        }
    };

    const sedeActual = sedes.find(
        (sede) => sede.id === selectedSede
    );

    const medicos = Array.from(
        new Map<string, { id: string; nombre: string }>(
            citas
                .filter((cita) => cita.medicoId && cita.medicoNombre)
                .map((cita): [string, { id: string; nombre: string }] => [
                    cita.medicoId!,
                    {
                        id: cita.medicoId!,
                        nombre: cita.medicoNombre!,
                    },
                ])
        ).values()
    );

    const servicios = Array.from(
        new Map<string, { id: string; nombre: string }>(
            citas.map((cita): [string, { id: string; nombre: string }] => [
                cita.servicioId,
                {
                    id: cita.servicioId,
                    nombre: cita.servicioNombre,
                },
            ])
        ).values()
    );

    const handleNew = () => {
        setActionError('');
        setEditingCita(null);
        setDetailCita(null);
        setFormOpen(true);
    };

    const handleView = (cita: Cita) => {
        setActionError('');
        setDetailCita(cita);
        if (cita.estado === 'atendiendo') setAtencionActivaId(cita.id);
    };

    const handleEdit = (cita: Cita) => {
        if (cita.estado === 'atendiendo' || cita.estado === 'cancelada') {
            setActionError('No se puede editar una cita iniciada o cancelada.');
            return;
        }
        setActionError('');
        if (cita.estado !== 'pendiente_atencion') {
            abrirEdicionHistorica(cita);
            return;
        }
        setDetailCita(null);
        setEditingCita(cita);
        setFormOpen(true);
    };

    const handleCancel = (cita: Cita) => {
        if (esFinal(cita.estado)) {
            setActionError(
                'Esta cita ya tiene un estado final y no se puede cancelar.'
            );
            return;
        }

        setActionError('');
        setDetailCita(null);
        setCancelTarget(cita);
    };

    const confirmCancel = async () => {
        if (!cancelTarget || isCancelling) return;

        setIsCancelling(true);
        setActionError('');

        try {
            await appointmentService.updateEstado(
                cancelTarget.id,
                'cancelada'
            );
            setCancelTarget(null);
        } catch (error) {
            console.error('Error cancelando cita:', error);
            setActionError(
                error instanceof Error
                    ? error.message
                    : 'No se pudo cancelar la cita.'
            );
        } finally {
            setIsCancelling(false);
        }
    };

    const handleChangeStatus = (cita: Cita, estado: AccionEstado) => {
        if (esFinal(cita.estado)) {
            setActionError('Esta cita ya tiene un estado final.');
            return;
        }

        if (estado === 'atendiendo') {
            const fecha = new Date(cita.fechaInicio);
            const hoy = new Date();
            if (fecha.getFullYear() !== hoy.getFullYear() ||
                fecha.getMonth() !== hoy.getMonth() ||
                fecha.getDate() !== hoy.getDate()) {
                setActionError('Esta cita solo puede iniciarse el día programado. Puedes adelantar la hora dentro de ese mismo día.');
                return;
            }
        }
        if (estado === 'atendiendo' && cita.estado !== 'pendiente_atencion') {
            setActionError('Solo se puede iniciar una cita pendiente de atención.');
            return;
        }

        if (estado === 'concluida_atencion' && cita.estado !== 'atendiendo') {
            setActionError('Primero debes iniciar la atención.');
            return;
        }

        if (estado === 'no_asistio' && cita.estado !== 'pendiente_atencion') {
            setActionError('Solo se puede marcar inasistencia en una cita pendiente.');
            return;
        }

        setActionError('');
        setEstadoTarget({ cita, estado });
    };

    const confirmChangeStatus = async () => {
        if (!estadoTarget || isChangingStatus) return;

        setIsChangingStatus(true);
        setActionError('');

        try {
            await appointmentService.updateEstado(
                estadoTarget.cita.id,
                estadoTarget.estado
            );
            if (estadoTarget.estado === 'atendiendo') {
                setAtencionActivaId(estadoTarget.cita.id);
                setDetailCita({ ...estadoTarget.cita, estado: 'atendiendo' });
            } else if (estadoTarget.estado === 'concluida_atencion') {
                setAtencionActivaId(null);
                setDetailCita(null);
            } else if (estadoTarget.estado === 'no_asistio') {
                const actualizada = await appointmentService.getById(estadoTarget.cita.id);
                setDetailCita(actualizada || { ...estadoTarget.cita, estado: 'no_asistio' });
            }
            setEstadoTarget(null);
        } catch (error) {
            console.error('Error cambiando estado:', error);
            setActionError(
                error instanceof Error
                    ? error.message
                    : 'No se pudo actualizar el estado.'
            );
        } finally {
            setIsChangingStatus(false);
        }
    };

    const detalleDato = (etiqueta: string, valor: React.ReactNode) => (
        <div style={{ minWidth: 0 }}>
            <div style={{
                color: 'var(--color-gray)',
                fontSize: '0.77rem',
                marginBottom: '0.25rem',
            }}>
                {etiqueta}
            </div>
            <div style={{
                color: 'var(--color-principal)',
                fontSize: '0.9rem',
                overflowWrap: 'anywhere',
            }}>
                {valor || '—'}
            </div>
        </div>
    );

    return (
        <div className="cita-page">
            <div className="cita-header">
                <div>
                    <h1 className="cita-title">Citas</h1>
                    <p className="cita-subtitle">
                        Gestiona las citas de{' '}
                        <strong>
                            {sedeActual?.nombre || 'la sede seleccionada'}
                        </strong>
                    </p>
                </div>

                <AppButton
                    variant="primary"
                    icon="fa-solid fa-plus"
                    iconPosition="left"
                    onClick={handleNew}
                    disabled={!selectedSede}
                >
                    Nueva Cita
                </AppButton>
            </div>

            <AppointmentFilters
                {...filters}
                medicos={medicos}
                servicios={servicios}
            />

            {(error || actionError) && (
                <div className="login-alert login-alert-error" role="alert">
                    <i className="fa-solid fa-circle-exclamation" />
                    <span>{actionError || error}</span>
                </div>
            )}

            {!isLoading && !error && citas.some(c => !c.reprogramadaHacia && vencidaSinGestionar(c)) && (
                <div className="cita-bloqueo-error" role="status" style={{ marginBottom: '1rem', marginTop: 0, background: '#fffbeb', borderColor: '#f5c36b', color: '#92400e' }}>
                    <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />{' '}
                    Hay citas de fechas anteriores que siguen pendientes sin gestión en esta página.
                    Revisa sus detalles antes de registrar una inasistencia o regularizar la atención.
                </div>
            )}

            {isLoading ? (
                <AppCard padding="md">
                    <AppLoader message="Cargando citas..." />
                </AppCard>
            ) : error ? (
                <AppCard padding="lg">
                    <AppEmptyState
                        icon="fa-solid fa-circle-exclamation"
                        title="Error al consultar citas"
                        message="Verifica la conexión y los permisos de Firestore."
                    />
                </AppCard>
            ) : citas.length === 0 ? (
                <AppCard padding="lg">
                    <AppEmptyState
                        icon="fa-solid fa-calendar-xmark"
                        title="Sin citas"
                        message="No hay citas que coincidan con los filtros aplicados."
                        action={
                            !filters.hasActiveFilters ? (
                                <AppButton
                                    variant="primary"
                                    icon="fa-solid fa-plus"
                                    iconPosition="left"
                                    onClick={handleNew}
                                    disabled={!selectedSede}
                                >
                                    Crear primera cita
                                </AppButton>
                            ) : (
                                <AppButton
                                    variant="ghost"
                                    onClick={filters.clearFilters}
                                >
                                    Limpiar filtros
                                </AppButton>
                            )
                        }
                    />
                </AppCard>
            ) : (
                <>
                    <div className="cita-table-wrapper">
                        <AppointmentTable
                            citas={citas}
                            ahora={ahoraAdministrativo}
                            onView={handleView}
                            onEdit={handleEdit}
                            onCancel={handleCancel}
                        />
                    </div>

                    <div className="cita-cards-wrapper">
                        {citas.map((cita) => (
                            <div key={cita.id} style={{ display: 'grid', gap: '0.35rem' }}>
                                <AppointmentCard
                                    cita={cita}
                                    onView={handleView}
                                    onEdit={handleEdit}
                                    onCancel={handleCancel}
                                />
                                {!cita.reprogramadaHacia && vencidaSinGestionar(cita) && (
                                    <span className="cita-status-badge" style={{ justifySelf: 'start', color: '#9a5b08', borderColor: '#f5c36b', background: '#fffbeb' }}>
                                        <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                                        Vencida sin gestionar
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>

                    <AppPagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalCitas}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                    />
                </>
            )}

            <AppointmentForm
                isOpen={formOpen}
                cita={editingCita}
                onClose={() => {
                    setFormOpen(false);
                    setEditingCita(null);
                }}
                onSuccess={() => {
                    setFormOpen(false);
                    setEditingCita(null);
                }}
            />

            {/* Detalle de cita: solo lectura */}
            <AppModal
                isOpen={!!detalleVigente}
                onClose={() => {
                    if (detalleVigente?.estado === 'atendiendo' ||
                        atencionActivaId === detalleVigente?.id) return;
                    setDetailCita(null);
                }}
                title="Detalle de cita"
                icon="fa-solid fa-calendar-check"
                size="lg"
                footer={detalleVigente?.estado === 'atendiendo' ||
                    atencionActivaId === detalleVigente?.id ? (
                    <span className="cita-bloqueo-activo">
                        Atención iniciada: conclúyela para cerrar este modal.
                    </span>
                ) : (
                    <AppButton variant="ghost" onClick={() => setDetailCita(null)}>
                        Cerrar
                    </AppButton>
                )}
            >
                {detalleVigente && (
                    <div className="service-form" style={{ display: 'grid', gap: '1.2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
                            <strong style={{ color: 'var(--color-principal)' }}>
                                {detalleVigente.pacienteNombre}
                            </strong>
                            {vencidaSinGestionar(historial.length > 0 ? historial[historial.length - 1] : detalleVigente) ? (
                                <span className="cita-status-badge" style={{ color: '#9a5b08', borderColor: '#f5c36b', background: '#fffbeb' }}>
                                    <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                                    Vencida sin gestionar
                                </span>
                            ) : (
                                <AppointmentStatusBadge estado={historial.length > 0 ? historial[historial.length - 1].estado : detalleVigente.estado} />
                            )}
                            {historial.length > 0 && historial[historial.length - 1].id !== detalleVigente.id && (
                                <span className="cita-duracion">
                                    Estado vigente · Estado original: <AppointmentStatusBadge estado={detalleVigente.estado} />
                                </span>
                            )}
                        </div>

                        {vencidaSinGestionar(historial.length > 0 ? historial[historial.length - 1] : detalleVigente) && (
                            <div className="cita-bloqueo-error" role="status" style={{ marginTop: 0, background: '#fffbeb', borderColor: '#f5c36b', color: '#92400e' }}>
                                <strong>Atención sin gestionar.</strong> Terminó el día programado y esta cita sigue pendiente.
                                Revisa con recepción y el profesional qué ocurrió. No se ha marcado automáticamente
                                como inasistencia: utiliza «No asistió» solamente si confirmas que el paciente no acudió.
                                Si sí fue atendido, requiere regularizar su atención con trazabilidad; no inventaremos
                                una conclusión retroactiva.
                            </div>
                        )}

                        <div style={DETALLE_ESTILO}>
                            {detalleDato('DNI', detalleVigente.pacienteDni)}
                            {detalleDato('WhatsApp', detalleVigente.pacienteWhatsapp)}
                            {detalleDato('Servicio', detalleVigente.servicioNombre)}
                            {detalleDato('Profesional', detalleVigente.medicoNombre || 'Sin asignar')}
                            {detalleDato('Fecha de esta franja', formatFechaHora(detalleVigente.fechaInicio))}
                            {historial.length > 1 && detalleDato('Última fecha programada', formatFechaHora(historial[historial.length - 1].fechaInicio))}
                            {detalleDato('Horario de esta franja', formatRango(detalleVigente.fechaInicio, detalleVigente.fechaFin))}
                            {historial.length > 1 && detalleDato('Último horario programado', formatRango(historial[historial.length - 1].fechaInicio, historial[historial.length - 1].fechaFin))}
                            {detalleVigente.fechaReprogramadaPara &&
                                detalleDato('Reprogramada para', formatFechaHora(detalleVigente.fechaReprogramadaPara))}
                            {detalleVigente.reprogramadaDesde &&
                                detalleDato('Tipo de registro', 'Nueva cita por reagendamiento')}
                            {detalleDato('Duración', `${detalleVigente.duracionMin} minutos`)}
                            {detalleDato('Sede', sedeActual?.nombre || '—')}
                            {detalleDato('Número de sesión', detalleVigente.numeroSesion)}
                            {detalleDato('Total de sesiones', detalleVigente.totalSesiones ?? 'No definido')}
                        </div>

                        <div style={{
                            ...DETALLE_ESTILO,
                            padding: '0.85rem',
                            background: '#f8fafc',
                            borderRadius: '0.7rem',
                        }}>
                            {detalleDato('Costo', moneda(detalleVigente.costo))}
                            {detalleDato('Anticipo', moneda(detalleVigente.anticipoReserva))}
                            {detalleDato('Saldo pendiente', moneda(detalleVigente.saldoPendiente))}
                        </div>

                        {detalleVigente.estado === 'no_asistio' && (
                            <div style={{ display: 'grid', gap: '0.7rem', padding: '0.95rem', background: '#f8fafc', borderRadius: '0.7rem' }}>
                                <strong>Seguimiento por inasistencia</strong>
                                {detalleVigente.seguimientoInasistencia ? (
                                    <>
                                        <div style={DETALLE_ESTILO}>
                                            {detalleDato('Estado de seguimiento', ({
                                                pendiente: 'Pendiente de contacto',
                                                contactado: 'Paciente contactado',
                                                sin_contacto: 'Cerrado sin contacto',
                                                reagendado: 'Paciente reagendado',
                                            })[detalleVigente.seguimientoInasistencia.estado])}
                                            {detalleDato('Fecha límite', formatFechaHora(detalleVigente.seguimientoInasistencia.fechaLimiteContacto))}
                                        </div>
                                        {(detalleVigente.seguimientoInasistencia.intentos || []).map((intento, indice) => (
                                            <div key={`${intento.fecha}-${indice}`} style={{ padding: '0.6rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}>
                                                <strong>{formatFechaHora(intento.fecha)}</strong> · {intento.medio} · {intento.resultado === 'respondio' ? 'Respondió' : 'Sin respuesta'}
                                                {intento.observacion && <div>{intento.observacion}</div>}
                                            </div>
                                        ))}
                                        {detalleVigente.seguimientoInasistencia.estado === 'pendiente' && !detalleVigente.reprogramadaHacia && (
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                {Date.now() < Date.parse(detalleVigente.seguimientoInasistencia.fechaLimiteContacto) ? (
                                                    <AppButton variant="ghost" onClick={() => abrirContacto(detalleVigente)}>
                                                        Registrar contacto
                                                    </AppButton>
                                                ) : (
                                                    <AppButton
                                                        variant="ghost"
                                                        disabled={cerrandoSeguimientoId === detalleVigente.id}
                                                        onClick={() => cerrarSeguimiento(detalleVigente)}
                                                    >
                                                        Cerrar sin contacto (3 días)
                                                    </AppButton>
                                                )}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div>Esta inasistencia no tiene seguimiento inicializado (registro antiguo).</div>
                                )}
                            </div>
                        )}

                        {(detalleVigente.reprogramadaDesde || detalleVigente.reprogramadaHacia ||
                            detalleVigente.fechaReprogramadaPara) && (
                                <section className="cita-timeline" aria-label="Historial de reagendamientos">
                                    <strong className="cita-timeline-title">Historial de franjas y reagendamientos</strong>
                                    <p className="cita-timeline-subtitle">
                                        Se conserva la franja anterior y se identifica la nueva cita registrada.
                                    </p>
                                    {historialCargando && <p className="cita-subtitle">Consultando historial...</p>}
                                    {!historialCargando && historial.map((registro, indice) => (
                                        <div key={registro.id} style={{
                                            marginTop: '0.8rem', padding: '0.8rem',
                                            background: registro.id === detalleVigente.id ? '#f1f6fc' : '#f8fafc',
                                            border: '1px solid #e2e8f0', borderRadius: '0.65rem',
                                        }}>
                                            <div style={{
                                                display: 'flex', justifyContent: 'space-between',
                                                alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem'
                                            }}>
                                                <strong>{indice === 0 ? 'Franja original' : `Reagendamiento ${indice}`}</strong>
                                                <AppointmentStatusBadge estado={registro.estado} />
                                            </div>
                                            <div style={{ marginTop: '0.5rem' }}>
                                                <strong>Fecha:</strong> {formatFechaHora(registro.fechaInicio)}
                                            </div>
                                            <div><strong>Horario:</strong> {formatRango(registro.fechaInicio, registro.fechaFin)}</div>
                                            <div><strong>Profesional:</strong> {registro.medicoNombre || 'Sin asignar'}</div>
                                            {registro.motivoReprogramacion &&
                                                <div><strong>Motivo:</strong> {registro.motivoReprogramacion}</div>}
                                            {registro.fechaReprogramacion &&
                                                <div><strong>Cambio registrado:</strong> {formatFechaHora(registro.fechaReprogramacion)}</div>}
                                            {registro.id !== detalleVigente.id &&
                                                <AppButton variant="ghost" onClick={() => setDetailCita(registro)}>
                                                    Ver esta cita
                                                </AppButton>}
                                        </div>
                                    ))}
                                    {!historialCargando && historial.length === 0 &&
                                        <p className="cita-subtitle">No se pudo cargar la cadena de citas.</p>}
                                </section>
                            )}

                        {detalleVigente.notas && detalleDato('Notas', detalleVigente.notas)}
                        {detalleVigente.observaciones && detalleDato('Observaciones', detalleVigente.observaciones)}

                        {['pendiente_atencion', 'no_asistio'].includes(detalleVigente.estado) && (
                            <AppButton variant="ghost" onClick={() => abrirReagendamiento(detalleVigente)}>
                                <i className="fa-solid fa-calendar-days" style={{ marginRight: '0.4rem' }} />
                                {detalleVigente.reprogramadaHacia ? 'Ver cita vigente' : 'Reagendar cita'}
                            </AppButton>
                        )}
                        {detalleVigente.estado === 'reprogramada' && detalleVigente.reprogramadaHacia && (
                            <AppButton variant="ghost" onClick={() => void abrirCitaVigente(detalleVigente)}>
                                Ver cita vigente
                            </AppButton>
                        )}

                        {detalleVigente.estado !== 'cancelada' && (
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {detalleVigente.estado === 'pendiente_atencion' && (
                                    <>
                                        <AppButton
                                            variant="primary"
                                            onClick={() => handleChangeStatus(detalleVigente, 'atendiendo')}
                                        >
                                            Iniciar atención
                                        </AppButton>
                                        <AppButton
                                            variant="ghost"
                                            onClick={() => handleChangeStatus(detalleVigente, 'no_asistio')}
                                        >
                                            No asistió
                                        </AppButton>
                                    </>
                                )}
                                {detalleVigente.estado === 'atendiendo' && (
                                    <AppButton
                                        variant="primary"
                                        onClick={() => handleChangeStatus(detalleVigente, 'concluida_atencion')}
                                    >
                                        Concluir atención
                                    </AppButton>
                                )}
                                {detalleVigente.estado !== 'atendiendo' && <>
                                    <AppButton variant="ghost" onClick={() => handleEdit(detalleVigente)}>
                                        Editar cita
                                    </AppButton>
                                    {!esFinal(detalleVigente.estado) &&
                                        <AppButton variant="ghost" onClick={() => handleCancel(detalleVigente)}>
                                            Cancelar cita
                                        </AppButton>}
                                </>}
                            </div>
                        )}
                    </div>
                )}
            </AppModal>

            {/* Editar datos administrativos sin perder la franja histórica. */}
            <AppModal
                isOpen={!!editHist}
                onClose={() => { if (!histGuardando) setEditHist(null); }}
                title="Editar datos de cita"
                icon="fa-solid fa-pen"
                size="lg"
                footer={<>
                    <AppButton variant="ghost" disabled={histGuardando}
                        onClick={() => setEditHist(null)}>Volver</AppButton>
                    <AppButton variant="primary" disabled={histGuardando}
                        onClick={guardarEdicionHistorica}>
                        {histGuardando ? 'Guardando...' : 'Guardar cambios'}
                    </AppButton>
                </>}
            >
                {editHist && <div className="service-form" style={{ display: 'grid', gap: '0.9rem' }}>
                    <p><strong>Paciente:</strong> {editHist.pacienteNombre}</p>
                    <p><strong>Franja conservada:</strong> {formatFechaHora(editHist.fechaInicio)} ·{' '}
                        {formatRango(editHist.fechaInicio, editHist.fechaFin)}</p>
                    <p className="cita-subtitle">Puedes corregir estos datos. Para cambiar una franja
                        activa utiliza «Reagendar cita»; la franja histórica nunca se sobrescribe.</p>
                    <label>WhatsApp del paciente
                        <input className="cita-datetime-input" value={histWhatsapp}
                            onChange={e => setHistWhatsapp(e.target.value)} disabled={histGuardando} />
                    </label>
                    <div style={DETALLE_ESTILO}>
                        <label>Costo (S/)
                            <input type="number" min="0" step="0.01" className="cita-datetime-input"
                                value={histCosto} onChange={e => setHistCosto(e.target.value)}
                                disabled={histGuardando} />
                        </label>
                        <label>Anticipo (S/)
                            <input type="number" min="0" step="0.01" className="cita-datetime-input"
                                value={histAnticipo} onChange={e => setHistAnticipo(e.target.value)}
                                disabled={histGuardando} />
                        </label>
                    </div>
                    <label>Notas
                        <textarea className="cita-datetime-input" rows={3} value={histNotas}
                            onChange={e => setHistNotas(e.target.value)} disabled={histGuardando} />
                    </label>
                    <label>Observaciones
                        <textarea className="cita-datetime-input" rows={3} value={histObservaciones}
                            onChange={e => setHistObservaciones(e.target.value)} disabled={histGuardando} />
                    </label>
                    {histError && <div className="cita-bloqueo-error" role="alert">{histError}</div>}
                </div>}
            </AppModal>

            {/* Registrar contacto durante seguimiento de una inasistencia. */}
            <AppModal
                isOpen={!!contactoCita}
                onClose={() => { if (!contactoGuardando) setContactoCita(null); }}
                title="Registrar intento de contacto"
                icon="fa-solid fa-phone"
                size="lg"
                footer={
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <AppButton variant="ghost" disabled={contactoGuardando} onClick={() => setContactoCita(null)}>
                            Volver
                        </AppButton>
                        <AppButton variant="primary" disabled={contactoGuardando} onClick={guardarContacto}>
                            {contactoGuardando ? 'Guardando...' : 'Guardar intento'}
                        </AppButton>
                    </div>
                }
            >
                {contactoCita && (
                    <div className="service-form" style={{ display: 'grid', gap: '1rem' }}>
                        <p><strong>Paciente:</strong> {contactoCita.pacienteNombre}</p>
                        <div>
                            <label htmlFor="cita-contacto-medio">Medio de contacto</label>
                            <select id="cita-contacto-medio" className="cita-datetime-input" value={contactoMedio}
                                onChange={(e) => setContactoMedio(e.target.value as CitaIntentoContacto['medio'])}
                                disabled={contactoGuardando}>
                                <option value="whatsapp">WhatsApp</option>
                                <option value="llamada">Llamada</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="cita-contacto-resultado">Resultado</label>
                            <select id="cita-contacto-resultado" className="cita-datetime-input" value={contactoResultado}
                                onChange={(e) => setContactoResultado(e.target.value as CitaIntentoContacto['resultado'])}
                                disabled={contactoGuardando}>
                                <option value="sin_respuesta">No respondió</option>
                                <option value="respondio">Respondió (cerrar seguimiento)</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="cita-contacto-nota">Observación (opcional)</label>
                            <textarea id="cita-contacto-nota" className="cita-datetime-input" rows={3} maxLength={1000}
                                value={contactoObservacion} onChange={(e) => setContactoObservacion(e.target.value)}
                                disabled={contactoGuardando} placeholder="Ej.: Se envió WhatsApp y no contestó." />
                        </div>
                        {contactoError && <div className="login-alert login-alert-error" role="alert">{contactoError}</div>}
                    </div>
                )}
            </AppModal>

            {/* Reagendar: mismo input y regleta que el registro principal. */}
            <AppModal
                isOpen={!!reagendarCita}
                onClose={cerrarReagendamiento}
                title="Reagendar cita"
                icon="fa-solid fa-calendar-days"
                size="lg"
                footer={
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <AppButton variant="ghost" onClick={cerrarReagendamiento} disabled={reagendarGuardando}>
                            Volver
                        </AppButton>
                        <AppButton
                            variant="primary"
                            onClick={confirmarReagendamiento}
                            loading={reagendarGuardando}
                            disabled={reagendarGuardando || reagendarReservando ||
                                !reservaPropiaReagendar || !reagendarMotivo.trim() ||
                                !!reagendarError || !!agendaError ||
                                evaluacionReagendar.tipo !== 'libre'}
                        >
                            Confirmar reagendamiento
                        </AppButton>
                    </div>
                }
            >
                {reagendarCita && (
                    <div className="service-form" style={{ display: 'grid', gap: '1rem' }}>
                        <p className="cita-subtitle"><strong>Sede actual:</strong> {sedeActual?.nombre || 'Sede de origen'}</p>
                        <div><strong>Paciente:</strong> {reagendarCita.pacienteNombre}</div>
                        <div><strong>Profesional:</strong> {reagendarCita.medicoNombre || '—'}</div>
                        <div><strong>Servicio:</strong> {reagendarCita.servicioNombre} ({reagendarCita.duracionMin} min)</div>
                        <div><strong>Horario original:</strong> {formatFechaHora(reagendarCita.fechaInicio)}</div>
                        <div className="service-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.8rem' }}>
                            <div>
                                <label htmlFor="cita-reagendar-fecha" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-principal)' }}>
                                    Fecha y hora solicitada *
                                </label>
                                <input
                                    id="cita-reagendar-fecha"
                                    className="cita-datetime-input"
                                    type="datetime-local"
                                    min={fechaLocal(new Date(ahoraReagendar))}
                                    step={60}
                                    value={reagendarFecha}
                                    onChange={e => { setReagendarFecha(e.target.value); setReagendarError(''); }}
                                    disabled={reagendarGuardando}
                                    required
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-principal)' }}>
                                    Duración de atención
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', minHeight: 44, padding: '0 0.7rem', border: '1px solid #e2e8f0', borderRadius: '0.625rem', background: '#f8fafc', boxSizing: 'border-box', fontSize: '0.78rem' }}>
                                    Predeterminada ({reagendarCita.duracionMin} min)
                                </div>
                            </div>
                        </div>

                        <section className="cita-timeline">
                            <div className="cita-timeline-header">
                                <div>
                                    <strong className="cita-timeline-title">Regleta de disponibilidad</strong>
                                    <p className="cita-timeline-subtitle">Minutos libres, registros y bloqueos temporales</p>
                                </div>
                                <span className="cita-timeline-live">Tiempo real</span>
                            </div>
                            <p className="cita-timeline-date">
                                {new Date(regletaReagendar.base).toLocaleDateString('es-PE', {
                                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                                })}
                            </p>
                            <div className="cita-timeline-scroll">
                                <svg width={regletaReagendar.ancho} height={81}
                                    viewBox={`0 0 ${regletaReagendar.ancho} 81`}
                                    role="img" aria-label="Regleta de disponibilidad del profesional">
                                    <rect x={0} y={21} width={regletaReagendar.ancho} height={52}
                                        rx={4} fill="#59b99a" opacity={0.2} />
                                    {horarioReagendar && <rect
                                        x={desdePxReagendar(Date.parse(horarioReagendar.fechaInicio))}
                                        y={21}
                                        width={(Date.parse(horarioReagendar.fechaFin) - Date.parse(horarioReagendar.fechaInicio)) /
                                            (regletaReagendar.fin - regletaReagendar.base) * regletaReagendar.ancho}
                                        height={52} fill="#4a93d3" opacity={0.65} />}
                                    {intervalosReagendar.map((item, i) => {
                                        const ini = Math.max(item.inicio, regletaReagendar.base);
                                        const fin = Math.min(item.fin, regletaReagendar.fin);
                                        if (fin <= ini) return null;
                                        return <rect key={`${i}-${item.inicio}`} x={desdePxReagendar(ini)}
                                            y={21} width={desdePxReagendar(fin) - desdePxReagendar(ini)} height={52}
                                            fill={item.tipo === 'temporal' ? '#9aa3af' : '#dc7777'} opacity={0.9} />;
                                    })}
                                    {Array.from({ length: regletaReagendar.minutosTotales + 1 }, (_, minuto) => {
                                        const x = minuto / regletaReagendar.minutosTotales * regletaReagendar.ancho;
                                        return <line key={minuto} x1={x} x2={x}
                                            y1={minuto % 60 === 0 ? 8 : minuto % 15 === 0 ? 13 : minuto % 5 === 0 ? 21 : 27}
                                            y2={73} stroke="currentColor" opacity={minuto % 15 === 0 ? 0.6 : 0.2}
                                            strokeWidth={minuto % 15 === 0 ? 1.2 : 0.5} />;
                                    })}
                                </svg>
                                <div aria-label="Horas y minutos visibles en la regleta" style={{
                                    position: 'relative', width: regletaReagendar.ancho, height: 23,
                                    color: '#243449', fontSize: 12, fontWeight: 700,
                                    fontVariantNumeric: 'tabular-nums', lineHeight: '18px',
                                }}>
                                    {Array.from({ length: Math.floor(regletaReagendar.minutosTotales / 15) + 1 }, (_, i) => {
                                        const minutos = i * 15;
                                        const posicion = minutos / regletaReagendar.minutosTotales * regletaReagendar.ancho;
                                        const etiqueta = new Date(regletaReagendar.base + minutos * 60_000)
                                            .toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
                                        return <span key={i} style={{
                                            position: 'absolute', left: posicion,
                                            transform: minutos === 0 ? 'none' :
                                                minutos === regletaReagendar.minutosTotales ? 'translateX(-100%)' : 'translateX(-50%)',
                                            whiteSpace: 'nowrap',
                                        }}>{etiqueta}</span>;
                                    })}
                                </div>
                            </div>
                            <div className="cita-timeline-legend">
                                {([['#59b99a', 'Libre'], ['#9aa3af', 'Temporal'],
                                ['#dc7777', 'Registrada'], ['#4a93d3', 'Nueva cita']] as const)
                                    .map(([color, texto]) => <span key={texto}>
                                        <i className="cita-timeline-dot" style={{ background: color }} />{texto}
                                    </span>)}
                            </div>
                            {evaluacionReagendar.tipo === 'temporal' &&
                                <div className="cita-bloqueo-error" role="alert">{evaluacionReagendar.mensaje}</div>}
                            {evaluacionReagendar.tipo === 'sin_espacio' &&
                                <div className="cita-bloqueo-error" role="alert">{evaluacionReagendar.mensaje}</div>}
                            {agendaError && <div className="cita-bloqueo-error" role="alert">{agendaError}</div>}
                            {horarioReagendar && <div className="cita-horario-resumen">
                                <strong>{textoHora(Date.parse(horarioReagendar.fechaInicio))} –{' '}
                                    {textoHora(Date.parse(horarioReagendar.fechaFin))}</strong>
                                <p>{horarioReagendar.fueReubicado
                                    ? 'Una cita registrada ocupa la hora solicitada. Se encontró el siguiente espacio continuo disponible.'
                                    : 'El horario solicitado está disponible.'}</p>
                                <small>{reservaPropiaReagendar
                                    ? 'Bloqueo temporal activo para este reagendamiento.'
                                    : reagendarReservando ? 'Reservando horario...'
                                        : 'Aún no se ha reservado el intervalo.'}</small>
                            </div>}
                            {!reagendarFecha && <p className="cita-subtitle" style={{ marginTop: 12 }}>
                                Selecciona fecha y hora para consultar el tramo deseado. La regleta permanecerá visible.
                            </p>}
                        </section>
                        <div>
                            <label htmlFor="cita-reagendar-motivo" style={{ display: 'block', marginBottom: '0.4rem' }}>
                                <strong>Motivo del reagendamiento *</strong>
                            </label>
                            <textarea id="cita-reagendar-motivo" className="cita-datetime-input"
                                rows={3} value={reagendarMotivo}
                                onChange={e => setReagendarMotivo(e.target.value)}
                                placeholder="Indica por qué se cambia la cita"
                                disabled={reagendarGuardando} />
                        </div>
                        {reagendarError && <div className="login-alert login-alert-error" role="alert">{reagendarError}</div>}
                    </div>
                )}
            </AppModal>

            <AppConfirmDialog
                isOpen={!!cancelTarget}
                onClose={() => {
                    if (!isCancelling) setCancelTarget(null);
                }}
                onConfirm={confirmCancel}
                title="Cancelar cita"
                message={
                    `¿Deseas cancelar la cita de ` +
                    `"${cancelTarget?.pacienteNombre || ''}"? ` +
                    `El registro se conservará en el historial.`
                }
                confirmText="Cancelar cita"
                variant="danger"
                loading={isCancelling}
            />

            <AppConfirmDialog
                isOpen={!!estadoTarget}
                onClose={() => {
                    if (!isChangingStatus) setEstadoTarget(null);
                }}
                onConfirm={confirmChangeStatus}
                title={estadoTarget ? CAMBIOS[estadoTarget.estado].titulo : 'Cambiar estado'}
                message={estadoTarget ?
                    `${CAMBIOS[estadoTarget.estado].mensaje} Paciente: ${estadoTarget.cita.pacienteNombre}.`
                    : ''}
                confirmText={estadoTarget ? CAMBIOS[estadoTarget.estado].confirmar : 'Confirmar'}
                loading={isChangingStatus}
            />
        </div>
    );
};
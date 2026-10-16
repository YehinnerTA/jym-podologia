import React, { useEffect, useMemo, useRef, useState } from 'react';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { AppModal, AppButton, AppInput, AppSelect, AppTextarea, AppFormField } from '../../../components';
import { useAuth } from '../../auth/context/AuthContext';
import { useCompany } from '../../company/context/CompanyContext';
import { Persona } from '../../people/person';
import { Servicio } from '../../services/service';
import { Cita, CitaFormData } from '../appointment';
import {
    appointmentService,
    type ReservaTemporal,
    type HorarioDisponible,
} from '../services/appointmentService';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    cita: Cita | null;
}

interface BloqueoVisual {
    id: string;
    tipo?: string;
    holdId?: string;
    ownerUid?: string;
}

interface ReservaVigente {
    horario: ReservaTemporal;
}

interface Intervalo {
    inicio: number;
    fin: number;
    tipo: 'registrada' | 'temporal';
}

type Evaluacion =
    | { tipo: 'libre'; horario: HorarioDisponible }
    | { tipo: 'temporal'; mensaje: string }
    | { tipo: 'sin_espacio'; mensaje: string }
    | { tipo: 'incompleta' };

const SLOT_MS = 5 * 60_000;
const DURACION_MAXIMA = 360;

const proximaHoraDisponible = (): string => {
    const fecha = new Date();
    fecha.setSeconds(0, 0);
    fecha.setMinutes(Math.ceil((fecha.getMinutes() + 1) / 5) * 5);
    return aLocal(fecha.toISOString());
};
const NOMBRE_BLOQUEADO = 'Este horario tiene un registro temporal en proceso. Selecciona otro horario para continuar.';

const aLocal = (iso: string): string => {
    if (!iso) return '';
    const fecha = new Date(iso);
    if (Number.isNaN(fecha.getTime())) return '';
    return new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60_000)
        .toISOString().slice(0, 16);
};

const textoHora = (ms: number): string =>
    new Date(ms).toLocaleTimeString('es-PE', {
        hour: 'numeric', minute: '2-digit', hour12: true,
    });

const normalizar = (texto: string): string =>
    texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const buscarPersona = (personas: Persona[], busqueda: string): Persona[] => {
    const termino = normalizar(busqueda);
    return personas.filter(p =>
        !termino || normalizar(p.nombre || '').includes(termino) ||
        String(p.dni || '').includes(termino)
    ).slice(0, 8);
};

const mismoHorario = (a: ReservaTemporal, b: ReservaTemporal): boolean =>
    a.sedeId === b.sedeId && a.medicoId === b.medicoId &&
    a.fechaInicio === b.fechaInicio && a.fechaFin === b.fechaFin;

const seCruzan = (a: { inicio: number; fin: number }, b: { inicio: number; fin: number }): boolean =>
    a.inicio < b.fin && a.fin > b.inicio;

export const AppointmentForm: React.FC<Props> = ({ isOpen, onClose, onSuccess, cita }) => {
    const { user, role } = useAuth();
    const { selectedSede, sedes } = useCompany();
    const autorizado = Boolean(user?.uid);
    const isEditing = Boolean(cita);

    const [pacientes, setPacientes] = useState<Persona[]>([]);
    const [medicos, setMedicos] = useState<Persona[]>([]);
    const [servicios, setServicios] = useState<Servicio[]>([]);
    const [pacienteId, setPacienteId] = useState('');
    const [medicoId, setMedicoId] = useState('');
    const [servicioId, setServicioId] = useState('');
    const [pacienteSearch, setPacienteSearch] = useState('');
    const [medicoSearch, setMedicoSearch] = useState('');
    const [pacienteAbierto, setPacienteAbierto] = useState(false);
    const [medicoAbierto, setMedicoAbierto] = useState(false);
    const [fechaHora, setFechaHora] = useState('');
    const [personalizada, setPersonalizada] = useState(false);
    const [minutos, setMinutos] = useState('30');
    const [costo, setCosto] = useState(0);
    const [anticipo, setAnticipo] = useState(0);
    const [numeroSesion, setNumeroSesion] = useState(1);
    const [totalSesiones, setTotalSesiones] = useState('');
    const [notas, setNotas] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [procesando, setProcesando] = useState(false);
    const [error, setError] = useState('');
    const [errorMedicos, setErrorMedicos] = useState('');
    const [errorAgenda, setErrorAgenda] = useState('');
    const [citas, setCitas] = useState<Cita[]>([]);
    const [bloqueos, setBloqueos] = useState<BloqueoVisual[]>([]);
    const [citasListas, setCitasListas] = useState(false);
    const [bloqueosListos, setBloqueosListos] = useState(false);
    const [reserva, setReserva] = useState<ReservaVigente | null>(null);
    const [ahora, setAhora] = useState(Date.now());

    const holdIdRef = useRef('');
    const reservaRef = useRef<ReservaVigente | null>(null);
    const colaRef = useRef<Promise<void>>(Promise.resolve());
    const revisionRef = useRef(0);
    const abiertaRef = useRef(false);
    const guardandoRef = useRef(false);
    const completadaRef = useRef(false);

    const sede = sedes.find(s => s.id === selectedSede && s.activo === true);
    const paciente = pacientes.find(p => p.id === pacienteId);
    const medico = medicos.find(p => p.id === medicoId);
    const servicio = servicios.find(s => s.id === servicioId);
    const duracionMin = personalizada ? Number(minutos) : servicio?.duracionMin ?? 0;
    const duracionValida = Number.isInteger(duracionMin) && duracionMin >= 1 && duracionMin <= DURACION_MAXIMA;
    const solicitadaMs = fechaHora ? new Date(fechaHora).getTime() : NaN;
    const fechaValida = Number.isFinite(solicitadaMs);
    const disponibilidadLista = Boolean(selectedSede && medicoId && citasListas && bloqueosListos && !errorAgenda);

    useEffect(() => {
        if (!isOpen) return;
        abiertaRef.current = true;
        completadaRef.current = false;
        guardandoRef.current = false;
        holdIdRef.current = doc(collection(db, 'cita_bloqueos')).id;
        reservaRef.current = null;
        colaRef.current = Promise.resolve();
        revisionRef.current++;
        setReserva(null);
        setPacienteId(cita?.pacienteId || '');
        setMedicoId(cita?.medicoId || '');
        setServicioId(cita?.servicioId || '');
        setPacienteSearch(cita?.pacienteNombre || '');
        setMedicoSearch(cita?.medicoNombre || '');
        setPacienteAbierto(false);
        setMedicoAbierto(false);
        setFechaHora(cita ? aLocal(cita.fechaInicio) : proximaHoraDisponible());
        setPersonalizada(false);
        setMinutos(String(cita?.duracionMin ?? 30));
        setCosto(cita?.costo ?? 0);
        setAnticipo(cita?.anticipoReserva ?? 0);
        setNumeroSesion(cita?.numeroSesion ?? 1);
        setTotalSesiones(cita?.totalSesiones == null ? '' : String(cita.totalSesiones));
        setNotas(cita?.notas || '');
        setObservaciones(cita?.observaciones || '');
        setError('');
        setErrorAgenda('');
        setErrorMedicos('');
        setAhora(Date.now());
        setProcesando(false);
    }, [isOpen, cita]);

    useEffect(() => {
        if (!isOpen) return;
        return () => {
            abiertaRef.current = false;
            revisionRef.current++;
            if (completadaRef.current) return;
            const identificador = holdIdRef.current;
            colaRef.current = colaRef.current.catch(() => undefined).then(async () => {
                const activa = reservaRef.current;
                if (activa) {
                    await appointmentService.liberarReservaTemporal(activa.horario, identificador);
                    reservaRef.current = null;
                }
            }).catch(err => console.error('No se pudo liberar el bloqueo temporal:', err));
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const timer = window.setInterval(() => setAhora(Date.now()), 5000);
        return () => window.clearInterval(timer);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || !autorizado) { setPacientes([]); return; }
        return onSnapshot(query(collection(db, 'personas'), where('tipo', '==', 'paciente')),
            snap => setPacientes(snap.docs.map(d => ({ ...d.data(), id: d.id } as Persona))
                .filter(p => p.activo === true && p.esTrabajador !== true && !p.authUid)
                .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))),
            err => { console.error(err); setError('No se pudieron consultar los pacientes.'); }
        );
    }, [isOpen, autorizado]);

    useEffect(() => {
        if (!isOpen || !autorizado || !selectedSede) { setServicios([]); return; }
        return onSnapshot(query(collection(db, 'servicios'),
            where('sedesIds', 'array-contains', selectedSede), where('activo', '==', true)),
            snap => setServicios(snap.docs.map(d => ({ ...d.data(), id: d.id } as Servicio))
                .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))),
            err => { console.error(err); setError('No se pudieron consultar los servicios de la sede.'); }
        );
    }, [isOpen, autorizado, selectedSede]);

    useEffect(() => {
        if (!isOpen || !autorizado || !selectedSede) { setMedicos([]); return; }
        setErrorMedicos('');
        return onSnapshot(query(collection(db, 'personas'),
            where('tipo', '==', 'medico'), where('sedesIds', 'array-contains', selectedSede),
            where('activo', '==', true)),
            snap => {
                setMedicos(snap.docs.map(d => ({ ...d.data(), id: d.id } as Persona))
                    .filter(p => p.esTrabajador === true)
                    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
                setErrorMedicos('');
            },
            err => { console.error(err); setMedicos([]); setErrorMedicos('No se pudieron consultar los profesionales. Revisa las reglas de Firestore para personas.'); }
        );
    }, [isOpen, autorizado, selectedSede]);

    useEffect(() => {
        if (!isOpen || !cita || !servicio) return;
        setPersonalizada(cita.duracionMin !== servicio.duracionMin);
        setMinutos(String(cita.duracionMin));
    }, [isOpen, cita, servicio]);

    useEffect(() => {
        if (!isOpen || !selectedSede || !medicoId) {
            setCitas([]); setBloqueos([]); setCitasListas(false); setBloqueosListos(false);
            return;
        }
        setCitasListas(false);
        setBloqueosListos(false);
        setErrorAgenda('');
        const stopCitas = onSnapshot(query(collection(db, 'citas'),
            where('sedeId', '==', selectedSede), where('medicoId', '==', medicoId)),
            snap => { setCitas(snap.docs.map(d => ({ ...d.data(), id: d.id } as Cita))); setCitasListas(true); },
            err => { console.error(err); setCitasListas(false); setErrorAgenda('No se pudieron consultar las citas del profesional.'); }
        );
        const stopBloqueos = onSnapshot(query(collection(db, 'cita_bloqueos'),
            where('sedeId', '==', selectedSede), where('medicoId', '==', medicoId)),
            snap => {
                setBloqueos(snap.docs.map(d => ({ id: d.id, ...d.data() } as BloqueoVisual)));
                setBloqueosListos(true);
            },
            err => { console.error(err); setBloqueosListos(false); setErrorAgenda('No se pudo consultar la disponibilidad temporal.'); }
        );
        return () => { stopCitas(); stopBloqueos(); };
    }, [isOpen, selectedSede, medicoId]);

    const intervalos = useMemo<Intervalo[]>(() => {
        const resultado: Intervalo[] = [];
        for (const item of citas) {
            if (item.id === cita?.id || !['pendiente_atencion', 'atendiendo'].includes(item.estado)) continue;
            const inicio = Date.parse(item.fechaInicio);
            const fin = Date.parse(item.fechaFin);
            if (Number.isFinite(inicio) && Number.isFinite(fin) && fin > inicio) {
                resultado.push({ inicio, fin, tipo: 'registrada' });
            }
        }
        for (const item of bloqueos) {
            if (item.tipo !== 'temporal') continue;
            if (item.holdId === holdIdRef.current && item.ownerUid === user?.uid) continue;
            const indice = Number(item.id.split('__').pop());
            if (!Number.isInteger(indice)) continue;
            const inicio = indice * SLOT_MS;
            resultado.push({ inicio, fin: inicio + SLOT_MS, tipo: 'temporal' });
        }
        return resultado;
    }, [citas, bloqueos, cita?.id, ahora, user?.uid]);

    const minFechaHora = aLocal(new Date(ahora).toISOString());

    const evaluacion = useMemo<Evaluacion>(() => {
        if (!fechaValida || !duracionValida || !selectedSede || !medicoId || !disponibilidadLista) {
            return { tipo: 'incompleta' };
        }
        if (solicitadaMs <= ahora && !isEditing) {
            return { tipo: 'sin_espacio', mensaje: 'La fecha y hora seleccionadas ya pasaron. Elige una hora posterior a la actual.' };
        }
        const finDelDia = new Date(new Date(solicitadaMs).getFullYear(),
            new Date(solicitadaMs).getMonth(), new Date(solicitadaMs).getDate() + 1).getTime();
        const registrados = intervalos.filter(i => i.tipo === 'registrada');
        const temporales = intervalos.filter(i => i.tipo === 'temporal');
        const inicioRedondeado = Math.ceil(solicitadaMs / SLOT_MS) * SLOT_MS;
        for (let inicio = inicioRedondeado; inicio <= inicioRedondeado + 12 * 60 * 60_000; inicio += SLOT_MS) {
            const fin = inicio + duracionMin * 60_000;
            if (fin > finDelDia) break;
            const candidato = { inicio, fin };
            if (temporales.some(i => seCruzan(candidato, i))) {
                return { tipo: 'temporal', mensaje: NOMBRE_BLOQUEADO };
            }
            if (!registrados.some(i => seCruzan(candidato, i))) {
                return {
                    tipo: 'libre', horario: {
                        fechaInicio: new Date(inicio).toISOString(),
                        fechaFin: new Date(fin).toISOString(),
                        fueReubicado: inicio !== solicitadaMs,
                    }
                };
            }
        }
        return { tipo: 'sin_espacio', mensaje: 'No hay un espacio continuo disponible para esta duración durante la fecha solicitada.' };
    }, [fechaValida, duracionValida, selectedSede, medicoId, disponibilidadLista,
        solicitadaMs, ahora, isEditing, intervalos, duracionMin]);

    const horarioElegido = evaluacion.tipo === 'libre' ? evaluacion.horario : null;
    const keyHorario = horarioElegido
        ? `${selectedSede}|${medicoId}|${horarioElegido.fechaInicio}|${horarioElegido.fechaFin}`
        : '';

    useEffect(() => {
        if (!isOpen || isEditing || !user || !holdIdRef.current || guardandoRef.current) return;
        if (evaluacion.tipo === 'incompleta' && !reservaRef.current) return;
        const revision = ++revisionRef.current;
        const identificador = holdIdRef.current;
        const uid = user.uid;
        const siguiente: ReservaTemporal | null = horarioElegido && selectedSede && medicoId
            ? { sedeId: selectedSede, medicoId, fechaInicio: horarioElegido.fechaInicio, fechaFin: horarioElegido.fechaFin }
            : null;

        if (siguiente && reservaRef.current && mismoHorario(reservaRef.current.horario, siguiente)) return;

        const timer = window.setTimeout(() => {
            if (!abiertaRef.current || revision !== revisionRef.current) return;
            setProcesando(true);
            colaRef.current = colaRef.current.catch(() => undefined).then(async () => {
                if (!abiertaRef.current || revision !== revisionRef.current || guardandoRef.current) return;
                const anterior = reservaRef.current;
                if (!siguiente) {
                    if (anterior) {
                        await appointmentService.liberarReservaTemporal(anterior.horario, identificador);
                        reservaRef.current = null;
                        if (abiertaRef.current) setReserva(null);
                    }
                    return;
                }
                try {
                    await appointmentService.actualizarReservaTemporal(
                        anterior?.horario ?? null, siguiente, identificador, uid
                    );
                    if (!abiertaRef.current || revision !== revisionRef.current) {
                        reservaRef.current = { horario: siguiente };
                        return;
                    }
                    const nueva = { horario: siguiente };
                    reservaRef.current = nueva;
                    setReserva(nueva);
                    setError('');
                } catch (err) {
                    if (abiertaRef.current && revision === revisionRef.current) {
                        setError(err instanceof Error ? err.message : 'No se pudo bloquear el horario.');
                    }
                }
            }).finally(() => {
                if (abiertaRef.current && revision === revisionRef.current) setProcesando(false);
            });
        }, 300);
        return () => window.clearTimeout(timer);
    }, [isOpen, isEditing, user?.uid, keyHorario, evaluacion.tipo, selectedSede, medicoId]);

    const regleta = useMemo(() => {
        const referencia = fechaValida ? new Date(solicitadaMs) : new Date(ahora);
        const base = fechaValida
            ? new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate(), referencia.getHours(), 0).getTime()
            : new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate(), 8, 0).getTime();
        const finCandidato = horarioElegido ? Date.parse(horarioElegido.fechaFin) : base + 2 * 60 * 60_000;
        const fin = fechaValida
            ? Math.ceil(Math.max(base + 2 * 60 * 60_000, finCandidato + 15 * 60_000) / 3_600_000) * 3_600_000
            : base + 4 * 60 * 60_000;
        const minutosTotales = Math.round((fin - base) / 60_000);
        return { base, fin, minutosTotales, ancho: Math.max(720, Math.ceil(minutosTotales / 60) * 330) };
    }, [fechaValida, solicitadaMs, horarioElegido?.fechaFin]);

    const desdePx = (ms: number): number =>
        (ms - regleta.base) / (regleta.fin - regleta.base) * regleta.ancho;
    const propia = reserva &&
        horarioElegido && mismoHorario(reserva.horario, {
            sedeId: selectedSede || '', medicoId,
            fechaInicio: horarioElegido.fechaInicio, fechaFin: horarioElegido.fechaFin,
        });
    const puedeGuardar = Boolean(autorizado && user && sede && paciente && medico && servicio &&
        duracionValida && horarioElegido && !guardando && !procesando && !errorAgenda && !errorMedicos &&
        (isEditing || propia));

    const cambiarServicio = (id: string) => {
        setServicioId(id);
        setPersonalizada(false);
        const elegido = servicios.find(item => item.id === id);
        if (elegido) { setCosto(elegido.precio); setMinutos(String(elegido.duracionMin)); }
    };

    const cerrar = () => {
        if (guardandoRef.current) return;
        abiertaRef.current = false;
        revisionRef.current++;
        onClose();
    };

    const guardar = async () => {
        if (guardandoRef.current) return;
        setError('');
        if (!user || !autorizado || !sede || !selectedSede) { setError('Selecciona una sede activa y verifica tu sesión.'); return; }
        if (cita && cita.sedeId !== selectedSede) { setError('La cita pertenece a otra sede.'); return; }
        if (!paciente || !servicio || !medico) { setError('Selecciona paciente, servicio y profesional válidos.'); return; }
        if (!duracionValida || !horarioElegido) { setError(evaluacion.tipo === 'sin_espacio' || evaluacion.tipo === 'temporal' ? evaluacion.mensaje : 'Selecciona una fecha y duración con disponibilidad.'); return; }
        if (!Number.isFinite(costo) || !Number.isFinite(anticipo) || costo < 0 || anticipo < 0 || anticipo > costo) {
            setError('Revisa el costo y el anticipo.'); return;
        }
        const total = totalSesiones.trim() ? Number(totalSesiones) : null;
        if (!Number.isInteger(numeroSesion) || numeroSesion < 1 ||
            (total !== null && (!Number.isInteger(total) || total < numeroSesion))) {
            setError('Revisa el número y total de sesiones.'); return;
        }
        const datos: CitaFormData = {
            sedeId: selectedSede,
            pacienteId: paciente.id, pacienteNombre: paciente.nombre,
            pacienteWhatsapp: paciente.whatsapp, pacienteDni: paciente.dni,
            medicoId: medico.id, medicoNombre: medico.nombre,
            servicioId: servicio.id, servicioNombre: servicio.nombre, duracionMin,
            fechaInicio: horarioElegido.fechaInicio, fechaFin: horarioElegido.fechaFin,
            costo, anticipoReserva: anticipo, saldoPendiente: costo - anticipo,
            numeroSesion, totalSesiones: total,
            notas: notas.trim(), observaciones: observaciones.trim(),
        };
        guardandoRef.current = true;
        setGuardando(true);
        try {
            await colaRef.current;
            if (cita) {
                await appointmentService.update(cita.id, datos);
            } else {
                const actual = reservaRef.current;
                if (!actual || !mismoHorario(actual.horario, {
                    sedeId: selectedSede, medicoId,
                    fechaInicio: horarioElegido.fechaInicio, fechaFin: horarioElegido.fechaFin,
                })) {
                    throw new Error('El bloqueo temporal no está vigente. Selecciona otro horario.');
                }
                await appointmentService.create(datos, user.uid, holdIdRef.current);
            }
            completadaRef.current = true;
            reservaRef.current = null;
            setReserva(null);
            onSuccess();
        } catch (err) {
            console.error('Error al guardar cita:', err);
            setError(err instanceof Error ? err.message : 'No se pudo registrar la cita.');
        } finally {
            guardandoRef.current = false;
            setGuardando(false);
        }
    };

    if (!autorizado) return null;

    return (
        <AppModal isOpen={isOpen} onClose={cerrar}
            title={isEditing ? 'Editar cita' : 'Nueva cita'}
            icon="fa-solid fa-calendar-plus" size="lg"
            footer={<>
                <AppButton variant="ghost" disabled={guardando} onClick={cerrar}>Cancelar</AppButton>
                <AppButton variant="primary" icon="fa-solid fa-floppy-disk" iconPosition="left"
                    loading={guardando} disabled={!puedeGuardar} onClick={guardar}>
                    {isEditing ? 'Guardar cambios' : 'Registrar cita'}
                </AppButton>
            </>}
        >
            <form className="service-form" onSubmit={e => { e.preventDefault(); void guardar(); }}>
                {error && <div className="service-form-error" role="alert">{error}</div>}
                <p className="cita-subtitle"><strong>Sede actual:</strong>{' '}
                    {sede?.nombre || 'Selecciona una sede en el header'}</p>

                <div className="service-form-grid">
                    <div className="service-form-full">
                        <AppFormField label="Paciente" required>
                            <div className="cita-search">
                                <input className="cita-datetime-input" autoComplete="off"
                                    placeholder="Buscar por nombre o DNI..." value={pacienteSearch}
                                    onFocus={() => setPacienteAbierto(true)}
                                    onBlur={() => window.setTimeout(() => setPacienteAbierto(false), 130)}
                                    onChange={e => { setPacienteSearch(e.target.value); setPacienteId(''); setPacienteAbierto(true); }} />
                                {pacienteAbierto && <div className="cita-search-results">
                                    {buscarPersona(pacientes, pacienteSearch).map(p =>
                                        <button className="cita-search-option" type="button" key={p.id}
                                            onMouseDown={e => e.preventDefault()}
                                            onClick={() => { setPacienteId(p.id); setPacienteSearch(p.nombre); setPacienteAbierto(false); }}>
                                            <strong>{p.nombre}</strong><small>DNI: {p.dni}</small>
                                        </button>
                                    )}
                                    {!buscarPersona(pacientes, pacienteSearch).length &&
                                        <p className="cita-search-empty">No se encontraron pacientes.</p>}
                                </div>}
                            </div>
                        </AppFormField>
                        {paciente && <p className="cita-selected-person"><i className="fa-solid fa-circle-check" />{paciente.nombre} seleccionado</p>}
                    </div>

                    <AppFormField label="Servicio" required>
                        <AppSelect value={servicioId} onChange={cambiarServicio}
                            options={[{ value: '', label: 'Selecciona un servicio' },
                            ...servicios.map(s => ({ value: s.id, label: `${s.nombre} (${s.duracionMin} min)` }))]}
                            placeholder="Tratamiento" />
                    </AppFormField>

                    <AppFormField label="Médico / Técnico" required>
                        <div className="cita-search">
                            <input className="cita-datetime-input" autoComplete="off"
                                placeholder="Buscar por nombre o DNI..." value={medicoSearch}
                                onFocus={() => setMedicoAbierto(true)}
                                onBlur={() => window.setTimeout(() => setMedicoAbierto(false), 130)}
                                onChange={e => { setMedicoSearch(e.target.value); setMedicoId(''); setMedicoAbierto(true); }} />
                            {medicoAbierto && <div className="cita-search-results">
                                {buscarPersona(medicos, medicoSearch).map(m =>
                                    <button className="cita-search-option" type="button" key={m.id}
                                        onMouseDown={e => e.preventDefault()}
                                        onClick={() => { setMedicoId(m.id); setMedicoSearch(m.nombre); setMedicoAbierto(false); }}>
                                        <strong>{m.nombre}</strong>
                                        <small>{role === 'admin' ? `DNI: ${m.dni}` : 'Profesional'}</small>
                                    </button>
                                )}
                                {!buscarPersona(medicos, medicoSearch).length &&
                                    <p className="cita-search-empty">No se encontraron profesionales.</p>}
                            </div>}
                        </div>
                        {errorMedicos && <p role="alert" className="cita-subtitle">{errorMedicos}</p>}
                    </AppFormField>

                    {/* Fecha y duración en la misma línea */}
                    <div className="service-form-full" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.8rem', alignItems: 'start'
                    }}>
                        <AppFormField label="Fecha y hora solicitada" required>
                            <input className="cita-datetime-input" type="datetime-local" required
                                min={isEditing ? undefined : minFechaHora}
                                step={60}
                                value={fechaHora}
                                disabled={guardando}
                                onChange={e => {
                                    setFechaHora(e.target.value);
                                    setError('');
                                }} />
                        </AppFormField>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-principal)' }}>
                                Duración de atención
                            </label>
                            <label style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                minHeight: 44, padding: '0 0.7rem', border: '1px solid #e2e8f0',
                                borderRadius: '0.625rem', background: '#f8fafc', boxSizing: 'border-box'
                            }}>
                                <input type="checkbox" checked={personalizada} disabled={!servicio || guardando}
                                    onChange={e => {
                                        setPersonalizada(e.target.checked);
                                        setMinutos(String(servicio?.duracionMin ?? 30));
                                    }} />
                                <span style={{ fontSize: '0.78rem', lineHeight: 1.25 }}>
                                    {personalizada ? 'Personalizada' : `Predeterminada (${servicio?.duracionMin ?? 0} min)`}
                                </span>
                            </label>
                            {personalizada && <AppFormField label="Minutos personalizados" required>
                                <AppInput type="number" value={minutos} onChange={setMinutos} />
                            </AppFormField>}
                        </div>
                    </div>

                    {/* REGLETA PERMANENTE: se dibuja incluso sin horario */}
                    <div className="service-form-full">
                        <section className="cita-timeline">
                            <div className="cita-timeline-header">
                                <div><strong className="cita-timeline-title">Regleta de disponibilidad</strong>
                                    <p className="cita-timeline-subtitle">Minutos libres, registros y bloqueos temporales</p>
                                </div>
                                <span className="cita-timeline-live">Tiempo real</span>
                            </div>
                            <p className="cita-timeline-date">
                                {new Date(regleta.base).toLocaleDateString('es-PE', {
                                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                                })}
                            </p>
                            <div className="cita-timeline-scroll">
                                <svg width={regleta.ancho} height={81}
                                    viewBox={`0 0 ${regleta.ancho} 81`}
                                    role="img" aria-label="Regleta de disponibilidad del profesional">
                                    <rect x={0} y={21} width={regleta.ancho} height={52}
                                        rx={4} fill="#59b99a" opacity={0.2} />
                                    {/* La cita seleccionada permanece azul hasta la confirmación. */}
                                    {horarioElegido && <rect x={desdePx(Date.parse(horarioElegido.fechaInicio))}
                                        y={21} width={(Date.parse(horarioElegido.fechaFin) -
                                            Date.parse(horarioElegido.fechaInicio)) /
                                            (regleta.fin - regleta.base) * regleta.ancho}
                                        height={52} fill="#4a93d3" opacity={0.65} />}
                                    {intervalos.map((item, i) => {
                                        const ini = Math.max(item.inicio, regleta.base);
                                        const fin = Math.min(item.fin, regleta.fin);
                                        if (fin <= ini) return null;
                                        return <rect key={`${i}-${item.inicio}`} x={desdePx(ini)}
                                            y={21} width={desdePx(fin) - desdePx(ini)} height={52}
                                            fill={item.tipo === 'temporal' ? '#9aa3af' : '#dc7777'} opacity={0.9} />;
                                    })}
                                    {Array.from({ length: regleta.minutosTotales + 1 }, (_, minuto) => {
                                        const x = minuto / regleta.minutosTotales * regleta.ancho;
                                        return <line key={minuto} x1={x} x2={x}
                                            y1={minuto % 60 === 0 ? 8 : minuto % 15 === 0 ? 13 : minuto % 5 === 0 ? 21 : 27}
                                            y2={73} stroke="currentColor" opacity={minuto % 15 === 0 ? 0.6 : 0.2}
                                            strokeWidth={minuto % 15 === 0 ? 1.2 : 0.5} />;
                                    })}
                                </svg>
                                <div aria-label="Horas y minutos visibles en la regleta"
                                    style={{
                                        position: 'relative', width: regleta.ancho, height: 23,
                                        color: '#243449', fontSize: 12, fontWeight: 700,
                                        fontVariantNumeric: 'tabular-nums', lineHeight: '18px'
                                    }}>
                                    {Array.from({ length: Math.floor(regleta.minutosTotales / 15) + 1 }, (_, i) => {
                                        const minutos = i * 15;
                                        const posicion = minutos / regleta.minutosTotales * regleta.ancho;
                                        const etiqueta = new Date(regleta.base + minutos * 60_000)
                                            .toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
                                        return <span key={i} style={{
                                            position: 'absolute', left: posicion,
                                            transform: minutos === 0 ? 'none' :
                                                minutos === regleta.minutosTotales ? 'translateX(-100%)' : 'translateX(-50%)',
                                            whiteSpace: 'nowrap'
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
                            {evaluacion.tipo === 'temporal' && <div className="cita-bloqueo-error" role="alert">
                                <i className="fa-solid fa-circle-exclamation" />{' '}{evaluacion.mensaje}
                            </div>}
                            {evaluacion.tipo === 'sin_espacio' && <div className="cita-bloqueo-error" role="alert">
                                {evaluacion.mensaje}
                            </div>}
                            {errorAgenda && <div className="cita-bloqueo-error" role="alert">{errorAgenda}</div>}
                            {horarioElegido && <div className="cita-horario-resumen">
                                <strong>{textoHora(Date.parse(horarioElegido.fechaInicio))} –{' '}
                                    {textoHora(Date.parse(horarioElegido.fechaFin))}</strong>
                                <p>{horarioElegido.fueReubicado
                                    ? 'Una cita registrada ocupa la hora solicitada. Se encontró el siguiente espacio continuo disponible.'
                                    : 'El horario solicitado está disponible.'}</p>
                                {!isEditing && <small>{propia
                                    ? 'Bloqueo temporal activo para este registro.'
                                    : procesando ? 'Reservando horario...' : 'Aún no se ha reservado el intervalo.'}</small>}
                            </div>}
                            {!medicoId && <p className="cita-subtitle" style={{ marginTop: 12 }}>
                                Selecciona un profesional para consultar sus horarios y crear el bloqueo temporal.
                            </p>}
                            {!fechaHora && <p className="cita-subtitle" style={{ marginTop: 12 }}>
                                Selecciona fecha y hora para consultar el tramo deseado. La regleta permanecerá visible.
                            </p>}
                        </section>
                    </div>

                    <AppFormField label="Costo (S/)">
                        <AppInput type="number" value={String(costo)} onChange={v => setCosto(Number(v))} />
                    </AppFormField>
                    <AppFormField label="Anticipo (S/)">
                        <AppInput type="number" value={String(anticipo)} onChange={v => setAnticipo(Number(v))} />
                    </AppFormField>
                    <AppFormField label="Número de sesión">
                        <AppInput type="number" value={String(numeroSesion)} onChange={v => setNumeroSesion(Number(v))} />
                    </AppFormField>
                    <AppFormField label="Total de sesiones">
                        <AppInput type="number" value={totalSesiones} onChange={setTotalSesiones} placeholder="Opcional" />
                    </AppFormField>
                    <div className="service-form-full">
                        <AppFormField label="Notas"><AppTextarea value={notas} onChange={setNotas} rows={2} /></AppFormField>
                    </div>
                    <div className="service-form-full">
                        <AppFormField label="Observaciones"><AppTextarea value={observaciones} onChange={setObservaciones} rows={2} /></AppFormField>
                    </div>
                </div>
            </form>
        </AppModal>
    );
};
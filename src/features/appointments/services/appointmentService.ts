import {
    collection,
    doc,
    getDocs,
    getDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    runTransaction,
    type DocumentReference,
} from 'firebase/firestore';

import { auth, db } from '../../../config/firebase';

import {
    Cita,
    CitaFormData,
    CitaEstado,
    CitaIntentoContacto,
    CitaSeguimientoInasistencia,
} from '../appointment';

const COLLECTION = 'citas';
const BLOQUEOS = 'cita_bloqueos';

const SLOT_MINUTES = 5;
const SLOT_MS = SLOT_MINUTES * 60 * 1000;

const MAX_DURATION_MINUTES = 360;
const MAX_SEARCH_MINUTES = 12 * 60;

const ESTADOS_QUE_OCUPAN: CitaEstado[] = [
    'pendiente_atencion',
    'atendiendo',
];

const ESTADOS_FINALES: CitaEstado[] = [
    'concluida_atencion',
    'no_asistio',
    'reprogramada',
    'cancelada',
];

export interface ReservaTemporal {
    sedeId: string;
    medicoId: string;
    fechaInicio: string;
    fechaFin: string;
}

export interface HorarioDisponible {
    fechaInicio: string;
    fechaFin: string;
    fueReubicado: boolean;
}

interface BloqueoData {
    tipo?: 'temporal' | 'confirmado';
    holdId?: string;
    ownerUid?: string;
    citaId?: string;
    sedeId?: string;
    medicoId?: string;
}

const ocupaHorario = (estado: CitaEstado): boolean =>
    ESTADOS_QUE_OCUPAN.includes(estado);

const esEstadoFinal = (estado: CitaEstado): boolean =>
    ESTADOS_FINALES.includes(estado);

const assertSession = (userId?: string): string => {
    const uid = auth.currentUser?.uid;

    if (!uid) {
        throw new Error(
            'Tu sesión ha finalizado. Inicia sesión nuevamente.'
        );
    }

    if (userId && userId !== uid) {
        throw new Error(
            'La cuenta actual no coincide con el usuario que realiza la operación.'
        );
    }

    return uid;
};

const parseFecha = (
    iso: string,
    campo: string
): number => {
    const tiempo = Date.parse(iso);

    if (!iso || !Number.isFinite(tiempo)) {
        throw new Error(
            `La ${campo} de la cita no es válida.`
        );
    }

    return tiempo;
};

const validarDuracion = (duracionMin: number): void => {
    if (
        !Number.isInteger(duracionMin) ||
        duracionMin <= 0 ||
        duracionMin > MAX_DURATION_MINUTES
    ) {
        throw new Error(
            'La duración debe estar entre 1 y 360 minutos.'
        );
    }
};

const validateCita = (data: CitaFormData): void => {
    if (!data.sedeId?.trim()) {
        throw new Error(
            'Selecciona una sede en el header.'
        );
    }

    if (!data.pacienteId?.trim()) {
        throw new Error('Selecciona un paciente.');
    }

    if (!data.servicioId?.trim()) {
        throw new Error('Selecciona un servicio.');
    }

    validarDuracion(data.duracionMin);

    const inicio = parseFecha(
        data.fechaInicio,
        'fecha de inicio'
    );

    const fin = parseFecha(
        data.fechaFin,
        'fecha de fin'
    );

    if (fin <= inicio) {
        throw new Error(
            'La fecha final debe ser posterior al inicio.'
        );
    }

    if (
        fin - inicio !==
        data.duracionMin * 60 * 1000
    ) {
        throw new Error(
            'La hora de finalización no coincide con la duración de la cita.'
        );
    }

    if (
        !Number.isFinite(data.costo) ||
        !Number.isFinite(data.anticipoReserva) ||
        !Number.isFinite(data.saldoPendiente) ||
        data.costo < 0 ||
        data.anticipoReserva < 0 ||
        data.anticipoReserva > data.costo
    ) {
        throw new Error(
            'El costo o el anticipo no son válidos.'
        );
    }

    if (
        Math.abs(
            data.saldoPendiente -
            (data.costo - data.anticipoReserva)
        ) > 0.001
    ) {
        throw new Error(
            'El saldo pendiente no coincide con el costo y el anticipo.'
        );
    }

    if (
        !Number.isInteger(data.numeroSesion) ||
        data.numeroSesion < 1
    ) {
        throw new Error(
            'El número de sesión no es válido.'
        );
    }

    if (
        data.totalSesiones !== null &&
        (
            !Number.isInteger(data.totalSesiones) ||
            data.totalSesiones < data.numeroSesion
        )
    ) {
        throw new Error(
            'El total de sesiones no es válido.'
        );
    }
};

const validarHorario = (
    data: ReservaTemporal
): void => {
    if (!data.sedeId?.trim()) {
        throw new Error(
            'No se identificó la sede.'
        );
    }

    if (!data.medicoId?.trim()) {
        throw new Error(
            'Selecciona un profesional para reservar el horario.'
        );
    }

    const inicio = parseFecha(
        data.fechaInicio,
        'fecha de inicio'
    );

    const fin = parseFecha(
        data.fechaFin,
        'fecha de fin'
    );

    const duracionMs = fin - inicio;

    if (
        duracionMs <= 0 ||
        duracionMs > MAX_DURATION_MINUTES * 60000
    ) {
        throw new Error(
            'El intervalo de reserva no es válido.'
        );
    }

    if (inicio <= Date.now()) {
        throw new Error(
            'No se puede reservar un horario pasado.'
        );
    }
};

const getSlotIds = (
    data: {
        sedeId: string;
        medicoId?: string;
        fechaInicio: string;
        fechaFin: string;
    }
): string[] => {
    const inicio = parseFecha(
        data.fechaInicio,
        'fecha de inicio'
    );

    const fin = parseFecha(
        data.fechaFin,
        'fecha de fin'
    );

    if (fin <= inicio) {
        throw new Error(
            'La hora final debe ser posterior a la inicial.'
        );
    }

    const primerTramo = Math.floor(inicio / SLOT_MS);
    const ultimoTramo = Math.ceil(fin / SLOT_MS);

    const sede = encodeURIComponent(data.sedeId);
    const profesional = encodeURIComponent(
        data.medicoId?.trim() || 'sin_asignar'
    );

    const ids: string[] = [];

    for (
        let tramo = primerTramo;
        tramo < ultimoTramo;
        tramo++
    ) {
        ids.push(
            `${sede}__${profesional}__${tramo}`
        );
    }

    return ids;
};

const getLockRef = (
    id: string
): DocumentReference =>
    doc(db, BLOQUEOS, id);

const getCitaRef = (
    id: string
): DocumentReference =>
    doc(db, COLLECTION, id);

const obtenerDatosBloqueo = (
    data: unknown
): BloqueoData =>
    (data || {}) as BloqueoData;

const esBloqueoActivo = (
    data: BloqueoData,
    _ahora: number
): boolean => data.tipo === 'temporal';

const perteneceAlHold = (
    data: BloqueoData,
    holdId: string,
    uid: string,
    _ahora: number
): boolean =>
    data.tipo === 'temporal' &&
    data.holdId === holdId &&
    data.ownerUid === uid;

const compararCitas = (
    a: Cita,
    b: Cita
): boolean =>
    a.estado === b.estado &&
    a.sedeId === b.sedeId &&
    (a.medicoId || '') === (b.medicoId || '') &&
    a.fechaInicio === b.fechaInicio &&
    a.fechaFin === b.fechaFin;

const verificarCitasAntiguas = async (
    data: {
        sedeId: string;
        medicoId?: string;
        fechaInicio: string;
        fechaFin: string;
    },
    excluirId?: string
): Promise<void> => {
    const consulta = query(
        collection(db, COLLECTION),
        where('sedeId', '==', data.sedeId)
    );

    const snapshot = await getDocs(consulta);

    const inicio = parseFecha(
        data.fechaInicio,
        'fecha de inicio'
    );

    const fin = parseFecha(
        data.fechaFin,
        'fecha de fin'
    );

    const medicoId = data.medicoId || '';

    const conflicto = snapshot.docs.some((documento) => {
        if (documento.id === excluirId) {
            return false;
        }

        const cita = documento.data() as Cita;

        if (!ocupaHorario(cita.estado)) {
            return false;
        }

        if ((cita.medicoId || '') !== medicoId) {
            return false;
        }

        const inicioExistente =
            Date.parse(cita.fechaInicio);

        const finExistente =
            Date.parse(cita.fechaFin);

        if (
            !Number.isFinite(inicioExistente) ||
            !Number.isFinite(finExistente)
        ) {
            return false;
        }

        return (
            inicio < finExistente &&
            fin > inicioExistente
        );
    });

    if (conflicto) {
        throw new Error(
            'Existe una cita registrada que ocupa este horario.'
        );
    }
};

const combinarDatosCita = (
    inicial: Cita,
    data: Partial<CitaFormData>
): CitaFormData => ({
    sedeId: inicial.sedeId,

    pacienteId:
        data.pacienteId ?? inicial.pacienteId,
    pacienteNombre:
        data.pacienteNombre ?? inicial.pacienteNombre,
    pacienteWhatsapp:
        data.pacienteWhatsapp ?? inicial.pacienteWhatsapp,
    pacienteDni:
        data.pacienteDni ?? inicial.pacienteDni,

    medicoId:
        data.medicoId ?? inicial.medicoId ?? '',
    medicoNombre:
        data.medicoNombre ?? inicial.medicoNombre ?? '',

    servicioId:
        data.servicioId ?? inicial.servicioId,
    servicioNombre:
        data.servicioNombre ?? inicial.servicioNombre,
    duracionMin:
        data.duracionMin ?? inicial.duracionMin,

    fechaInicio:
        data.fechaInicio ?? inicial.fechaInicio,
    fechaFin:
        data.fechaFin ?? inicial.fechaFin,

    costo:
        data.costo ?? inicial.costo,
    anticipoReserva:
        data.anticipoReserva ?? inicial.anticipoReserva,
    saldoPendiente:
        data.saldoPendiente ?? inicial.saldoPendiente,

    numeroSesion:
        data.numeroSesion ?? inicial.numeroSesion,
    totalSesiones:
        data.totalSesiones === undefined
            ? inicial.totalSesiones
            : data.totalSesiones,

    notas:
        data.notas ?? inicial.notas,
    observaciones:
        data.observaciones ?? inicial.observaciones,
});

export const appointmentService = {

    async getAll(): Promise<Cita[]> {
        const consulta = query(
            collection(db, COLLECTION),
            orderBy('fechaInicio', 'desc')
        );

        const snapshot = await getDocs(consulta);

        return snapshot.docs.map((documento) => ({
            ...documento.data(),
            id: documento.id,
        } as Cita));
    },

    async getBySede(
        sedeId: string
    ): Promise<Cita[]> {
        const consulta = query(
            collection(db, COLLECTION),
            where('sedeId', '==', sedeId),
            orderBy('fechaInicio', 'desc')
        );

        const snapshot = await getDocs(consulta);

        return snapshot.docs.map((documento) => ({
            ...documento.data(),
            id: documento.id,
        } as Cita));
    },

    async getById(
        id: string
    ): Promise<Cita | null> {
        if (!id) return null;

        const snapshot = await getDoc(
            getCitaRef(id)
        );

        if (!snapshot.exists()) {
            return null;
        }

        return {
            ...snapshot.data(),
            id: snapshot.id,
        } as Cita;
    },

    async buscarPrimerHorarioDisponible(
        data: {
            sedeId: string;
            medicoId: string;
            fechaInicio: string;
            duracionMin: number;
        },
        excluirCitaId?: string,
        ignorarHoldId?: string
    ): Promise<HorarioDisponible | null> {
        assertSession();

        if (!data.sedeId?.trim()) {
            throw new Error(
                'Selecciona una sede.'
            );
        }

        if (!data.medicoId?.trim()) {
            throw new Error(
                'Selecciona un profesional.'
            );
        }

        validarDuracion(data.duracionMin);

        const inicioSolicitado = parseFecha(
            data.fechaInicio,
            'fecha de inicio'
        );

        const primerInicio =
            Math.ceil(inicioSolicitado / SLOT_MS) *
            SLOT_MS;

        const duracionMs =
            data.duracionMin * 60000;

        const fechaSolicitada =
            new Date(inicioSolicitado);

        const finDelDia = new Date(
            fechaSolicitada.getFullYear(),
            fechaSolicitada.getMonth(),
            fechaSolicitada.getDate() + 1
        ).getTime();

        const [citasSnapshot, bloqueosSnapshot] =
            await Promise.all([
                getDocs(
                    query(
                        collection(db, COLLECTION),
                        where('sedeId', '==', data.sedeId)
                    )
                ),
                getDocs(
                    query(
                        collection(db, BLOQUEOS),
                        where('sedeId', '==', data.sedeId),
                        where('medicoId', '==', data.medicoId)
                    )
                ),
            ]);

        const intervalos: Array<{
            inicio: number;
            fin: number;
        }> = [];

        for (const documento of citasSnapshot.docs) {
            if (
                documento.id === excluirCitaId
            ) {
                continue;
            }

            const cita = documento.data() as Cita;

            if (
                !ocupaHorario(cita.estado) ||
                (cita.medicoId || '') !== data.medicoId
            ) {
                continue;
            }

            const inicio = Date.parse(
                cita.fechaInicio
            );

            const fin = Date.parse(
                cita.fechaFin
            );

            if (
                Number.isFinite(inicio) &&
                Number.isFinite(fin)
            ) {
                intervalos.push({
                    inicio,
                    fin,
                });
            }
        }

        const ahora = Date.now();

        const tramosOcupados = new Set<number>();

        for (const documento of bloqueosSnapshot.docs) {
            const bloqueo = obtenerDatosBloqueo(
                documento.data()
            );

            if (
                ignorarHoldId &&
                bloqueo.tipo === 'temporal' &&
                bloqueo.holdId === ignorarHoldId &&
                bloqueo.ownerUid === auth.currentUser?.uid
            ) {
                continue;
            }

            if (
                excluirCitaId &&
                bloqueo.citaId === excluirCitaId
            ) {
                continue;
            }

            if (!esBloqueoActivo(bloqueo, ahora)) {
                continue;
            }

            const parte = documento.id.split('__').pop();

            if (!parte) continue;

            const indice = Number(parte);

            if (Number.isInteger(indice)) {
                tramosOcupados.add(indice);
            }
        }

        const buscarConflicto = (
            inicio: number,
            fin: number
        ): boolean => {
            if (
                intervalos.some(
                    (item) =>
                        inicio < item.fin &&
                        fin > item.inicio
                )
            ) {
                return true;
            }

            const primerTramo =
                Math.floor(inicio / SLOT_MS);

            const ultimoTramo =
                Math.ceil(fin / SLOT_MS);

            for (
                let tramo = primerTramo;
                tramo < ultimoTramo;
                tramo++
            ) {
                if (tramosOcupados.has(tramo)) {
                    return true;
                }
            }

            return false;
        };

        for (
            let desplazamiento = 0;
            desplazamiento <= MAX_SEARCH_MINUTES;
            desplazamiento += SLOT_MINUTES
        ) {
            const inicio =
                primerInicio + desplazamiento * 60000;

            const fin = inicio + duracionMs;

            if (fin > finDelDia) {
                break;
            }

            if (inicio <= Date.now()) {
                continue;
            }

            if (!buscarConflicto(inicio, fin)) {
                return {
                    fechaInicio:
                        new Date(inicio).toISOString(),
                    fechaFin:
                        new Date(fin).toISOString(),
                    fueReubicado:
                        inicio !== inicioSolicitado,
                };
            }
        }

        return null;
    },

    async actualizarReservaTemporal(
        anterior: ReservaTemporal | null,
        siguiente: ReservaTemporal,
        holdId: string,
        userId: string
    ): Promise<void> {
        const uid = assertSession(userId);
        if (!holdId?.trim()) throw new Error('La sesión temporal no es válida.');
        validarHorario(siguiente);
        await verificarCitasAntiguas(siguiente);

        const nuevosIds = getSlotIds(siguiente);
        const viejosIds = anterior ? getSlotIds(anterior) : [];
        const todosIds = [...new Set([...nuevosIds, ...viejosIds])];
        const refs = todosIds.map(getLockRef);
        const nuevos = new Set(nuevosIds);

        return runTransaction(db, async (tx) => {
            const documentos = await Promise.all(refs.map(ref => tx.get(ref)));
            const ahora = Date.now();
            const datos = new Map(todosIds.map((id, i) => [
                id,
                documentos[i].exists() ? obtenerDatosBloqueo(documentos[i].data()) : null,
            ] as const));

            for (const id of nuevosIds) {
                const bloqueo = datos.get(id);
                if (!bloqueo) continue;
                if (perteneceAlHold(bloqueo, holdId, uid, ahora)) continue;
                if (esBloqueoActivo(bloqueo, ahora)) {
                    throw new Error('Horario bloqueado temporalmente por otro usuario. Elige otro horario.');
                }
            }

            for (const id of viejosIds) {
                const bloqueo = datos.get(id);
                if (bloqueo && bloqueo.tipo === 'temporal' &&
                    bloqueo.holdId === holdId && bloqueo.ownerUid !== uid) {
                    throw new Error('El bloqueo temporal no te pertenece.');
                }
            }

            for (let i = 0; i < todosIds.length; i++) {
                const id = todosIds[i];
                const ref = refs[i];
                const bloqueo = datos.get(id);
                if (!nuevos.has(id)) {
                    if (bloqueo?.tipo === 'temporal' && bloqueo.holdId === holdId && bloqueo.ownerUid === uid) {
                        tx.delete(ref);
                    }
                    continue;
                }
                tx.set(ref, {
                    tipo: 'temporal', holdId, ownerUid: uid,
                    sedeId: siguiente.sedeId, medicoId: siguiente.medicoId,
                    createdAt: serverTimestamp(),
                });
            }
        });
    },

    async reservarTemporalmente(
        data: ReservaTemporal,
        holdId: string,
        userId: string
    ): Promise<void> {
        return this.actualizarReservaTemporal(null, data, holdId, userId);
    },

    async liberarReservaTemporal(
        data: ReservaTemporal,
        holdId: string
    ): Promise<void> {
        const uid = assertSession();

        if (!holdId?.trim()) return;

        const refs = getSlotIds(data).map(getLockRef);

        await runTransaction(
            db,
            async (transaction) => {
                const snapshots = await Promise.all(
                    refs.map((ref) =>
                        transaction.get(ref)
                    )
                );

                refs.forEach((ref, index) => {
                    const snapshot = snapshots[index];

                    if (!snapshot.exists()) return;

                    const bloqueo = obtenerDatosBloqueo(
                        snapshot.data()
                    );

                    if (
                        bloqueo.tipo === 'temporal' &&
                        bloqueo.holdId === holdId &&
                        bloqueo.ownerUid === uid
                    ) {
                        transaction.delete(ref);
                    }
                });
            }
        );
    },

    async create(
        data: CitaFormData,
        userId: string,
        holdId?: string
    ): Promise<string> {
        const uid = assertSession(userId);
        validateCita(data);
        if (parseFecha(data.fechaInicio, 'fecha de inicio') <= Date.now()) {
            throw new Error('La nueva cita debe tener una fecha futura.');
        }
        if (!holdId) {
            throw new Error('Debes obtener un bloqueo temporal antes de registrar la cita.');
        }
        await verificarCitasAntiguas(data);
        const citaRef = doc(collection(db, COLLECTION));
        const refs = getSlotIds(data).map(getLockRef);

        await runTransaction(db, async (tx) => {
            const sede = await tx.get(doc(db, 'sedes', data.sedeId));
            const slots = await Promise.all(refs.map(ref => tx.get(ref)));
            if (!sede.exists() || sede.data().activo !== true) {
                throw new Error('La sede seleccionada no está activa.');
            }
            const ahora = Date.now();
            if (!slots.every(slot => slot.exists() && perteneceAlHold(
                obtenerDatosBloqueo(slot.data()), holdId, uid, ahora
            ))) {
                throw new Error('El bloqueo temporal cambió o ya no te pertenece. Selecciona nuevamente el horario.');
            }
            tx.set(citaRef, {
                ...data,
                sedeNombre: sede.data().nombre || '',
                estado: 'pendiente_atencion',
                confirmada: false,
                motivoCancelacion: null,
                reprogramadaDesde: null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: uid,
            });
            for (const ref of refs) tx.delete(ref);
        });
        return citaRef.id;
    },

    async reagendar(
        citaOrigenId: string,
        data: CitaFormData,
        holdId: string,
        motivo: string
    ): Promise<string> {
        const uid = assertSession();

        if (!citaOrigenId?.trim()) {
            throw new Error('No se identificó la cita de origen.');
        }

        if (!holdId?.trim()) {
            throw new Error('Reserva temporal requerida para reagendar.');
        }

        if (!motivo?.trim()) {
            throw new Error('Indica el motivo del reagendamiento.');
        }

        validateCita(data);

        if (parseFecha(data.fechaInicio, 'fecha de inicio') <= Date.now()) {
            throw new Error('La nueva fecha debe ser futura.');
        }

        if (!data.medicoId?.trim()) {
            throw new Error('Selecciona un profesional para reagendar.');
        }

        const anteriorRef = getCitaRef(citaOrigenId);
        const origenSnapshot = await getDoc(anteriorRef);

        if (!origenSnapshot.exists()) {
            throw new Error('La cita original ya no existe.');
        }

        const origen = {
            ...origenSnapshot.data(),
            id: origenSnapshot.id,
        } as Cita;

        if (origen.sedeId !== data.sedeId) {
            throw new Error('No se puede reagendar una cita a otra sede.');
        }

        if (origen.pacienteId !== data.pacienteId) {
            throw new Error('El paciente debe ser el mismo que en la cita original.');
        }

        if (!['pendiente_atencion', 'no_asistio'].includes(origen.estado)) {
            throw new Error('Solo se pueden reagendar citas pendientes o inasistencias.');
        }

        if (origen.reprogramadaHacia) {
            throw new Error('Esta cita ya tiene un reagendamiento registrado.');
        }

        await verificarCitasAntiguas(data, citaOrigenId);

        const nuevaRef = doc(collection(db, COLLECTION));
        const tramos = getSlotIds(data).map(getLockRef);
        const sedeRef = doc(db, 'sedes', data.sedeId);

        await runTransaction(db, async (tx) => {
            const [actualSnapshot, sedeSnapshot, ...bloqueos] = await Promise.all([
                tx.get(anteriorRef),
                tx.get(sedeRef),
                ...tramos.map((ref) => tx.get(ref)),
            ]);

            if (!actualSnapshot.exists()) {
                throw new Error('La cita original ya no existe.');
            }

            const actual = {
                ...actualSnapshot.data(),
                id: actualSnapshot.id,
            } as Cita;

            if (
                !compararCitas(actual, origen) ||
                actual.reprogramadaHacia ||
                !['pendiente_atencion', 'no_asistio'].includes(actual.estado)
            ) {
                throw new Error(
                    'La cita original fue modificada o ya se reagendó. Actualiza la lista.'
                );
            }

            if (!sedeSnapshot.exists() || sedeSnapshot.data().activo !== true) {
                throw new Error('La sede ya no está activa.');
            }

            const ahora = Date.now();
            const tieneReserva = bloqueos.every((snapshot) =>
                snapshot.exists() &&
                perteneceAlHold(
                    obtenerDatosBloqueo(snapshot.data()),
                    holdId,
                    uid,
                    ahora
                )
            );

            if (!tieneReserva) {
                throw new Error(
                    'La reserva temporal del horario cambió. Selecciona nuevamente la fecha.'
                );
            }

            tx.update(anteriorRef, {
                estado: actual.estado === 'no_asistio'
                    ? 'no_asistio'
                    : 'reprogramada',
                reprogramadaHacia: nuevaRef.id,
                fechaReprogramadaPara: data.fechaInicio,
                motivoReprogramacion: motivo.trim(),
                fechaReprogramacion: new Date().toISOString(),
                ...(actual.estado === 'no_asistio' && actual.seguimientoInasistencia ? {
                    seguimientoInasistencia: {
                        ...actual.seguimientoInasistencia,
                        estado: 'reagendado',
                        fechaCierre: new Date().toISOString(),
                    },
                } : {}),
                updatedAt: serverTimestamp(),
            });

            tx.set(nuevaRef, {
                ...data,
                sedeNombre: sedeSnapshot.data().nombre || '',
                estado: 'pendiente_atencion',
                confirmada: false,
                motivoCancelacion: null,
                reprogramadaDesde: citaOrigenId,
                reprogramadaHacia: null,
                motivoReprogramacion: motivo.trim(),
                fechaReprogramacion: new Date().toISOString(),
                seguimientoInasistencia: null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: uid,
            });

            for (const ref of tramos) {
                tx.delete(ref);
            }
        });

        return nuevaRef.id;
    },

    async update(id: string, data: Partial<CitaFormData>): Promise<void> {
        assertSession();
        if (!id) throw new Error('No se identificó la cita.');
        const citaRef = getCitaRef(id);
        const originalDoc = await getDoc(citaRef);
        if (!originalDoc.exists()) throw new Error('La cita no existe.');
        const original = { ...originalDoc.data(), id } as Cita;
        if (esEstadoFinal(original.estado)) {
            throw new Error('No se puede editar una cita finalizada o cancelada.');
        }
        if (data.sedeId && data.sedeId !== original.sedeId) {
            throw new Error('No se puede trasladar una cita a otra sede.');
        }
        const combinados = combinarDatosCita(original, data);
        validateCita(combinados);
        await verificarCitasAntiguas(combinados, id);
        const refs = getSlotIds(combinados).map(getLockRef);

        await runTransaction(db, async tx => {
            const actualDoc = await tx.get(citaRef);
            const slots = await Promise.all(refs.map(ref => tx.get(ref)));
            if (!actualDoc.exists()) throw new Error('La cita no existe.');
            const actual = { ...actualDoc.data(), id } as Cita;
            if (!compararCitas(actual, original) || esEstadoFinal(actual.estado)) {
                throw new Error('La cita cambió. Vuelve a abrirla antes de guardar.');
            }
            const ahora = Date.now();
            if (slots.some(slot => slot.exists() && esBloqueoActivo(
                obtenerDatosBloqueo(slot.data()), ahora
            ))) {
                throw new Error('Este horario tiene un bloqueo temporal. Elige otro horario.');
            }
            tx.update(citaRef, {
                ...combinados,
                updatedAt: serverTimestamp(),
            });
        });
    },

    async actualizarDatosAdministrativos(
        id: string,
        datos: {
            pacienteWhatsapp: string;
            notas: string;
            observaciones: string;
            costo: number;
            anticipoReserva: number;
        }
    ): Promise<void> {
        assertSession();
        if (!id) throw new Error('No se identificó la cita.');
        if (!Number.isFinite(datos.costo) || datos.costo < 0 ||
            !Number.isFinite(datos.anticipoReserva) || datos.anticipoReserva < 0 ||
            datos.anticipoReserva > datos.costo) {
            throw new Error('Revisa el costo y el anticipo.');
        }
        await runTransaction(db, async tx => {
            const ref = getCitaRef(id);
            const snap = await tx.get(ref);
            if (!snap.exists()) throw new Error('La cita ya no existe.');
            const cita = snap.data() as Cita;
            if (cita.estado === 'atendiendo' || cita.estado === 'cancelada') {
                throw new Error('No se puede editar una atención iniciada ni una cita cancelada.');
            }
            tx.update(ref, {
                pacienteWhatsapp: datos.pacienteWhatsapp.trim(),
                notas: datos.notas.trim(),
                observaciones: datos.observaciones.trim(),
                costo: datos.costo,
                anticipoReserva: datos.anticipoReserva,
                saldoPendiente: datos.costo - datos.anticipoReserva,
                updatedAt: serverTimestamp(),
            });
        });
    },

    async updateEstado(id: string, estado: Cita['estado']): Promise<void> {
        assertSession();
        if (!id) throw new Error('No se identificó la cita.');
        const ref = getCitaRef(id);
        const inicial = await getDoc(ref);
        if (!inicial.exists()) throw new Error('La cita no existe.');
        const citaInicial = inicial.data() as Cita;
        if (estado === 'atendiendo' && citaInicial.medicoId) {
            const otros = await getDocs(query(collection(db, COLLECTION),
                where('sedeId', '==', citaInicial.sedeId)));
            const ocupado = otros.docs.some(d => d.id !== id &&
                d.data().medicoId === citaInicial.medicoId &&
                d.data().estado === 'atendiendo');
            if (ocupado) {
                throw new Error('El profesional ya tiene otra atención iniciada. Conclúyela antes de comenzar esta cita.');
            }
        }
        const bloqueoRefs = getSlotIds(citaInicial).map(getLockRef);
        const sedeRef = doc(db, 'sedes', citaInicial.sedeId);
        const medicoKey = encodeURIComponent(citaInicial.medicoId || 'sin_asignar');
        await runTransaction(db, async tx => {
            const [snap, sedeSnapshot, ...locks] = await Promise.all([
                tx.get(ref), tx.get(sedeRef), ...bloqueoRefs.map(r => tx.get(r)),
            ]);
            if (!sedeSnapshot.exists() || sedeSnapshot.data().activo !== true) {
                throw new Error('La sede no está activa.');
            }
            const ocupaciones = {
                ...((sedeSnapshot.data().agendaAtencionesActivas || {}) as Record<string, string>),
            };
            if (!snap.exists()) throw new Error('La cita no existe.');
            const actual = snap.data() as Cita;
            if (esEstadoFinal(actual.estado)) {
                throw new Error('Esta cita ya tiene un estado final.');
            }
            if (estado === 'atendiendo') {
                if (ocupaciones[medicoKey] && ocupaciones[medicoKey] !== id) {
                    throw new Error('El profesional ya tiene una atención activa. Conclúyela antes de iniciar otra.');
                }
                if (actual.estado !== 'pendiente_atencion') {
                    throw new Error('Solo se puede iniciar una cita pendiente.');
                }
                const programada = new Date(actual.fechaInicio);
                const hoy = new Date();
                if (!Number.isFinite(programada.getTime()) ||
                    programada.getFullYear() !== hoy.getFullYear() ||
                    programada.getMonth() !== hoy.getMonth() ||
                    programada.getDate() !== hoy.getDate()) {
                    throw new Error('Solo puedes iniciar una atención durante su fecha programada. En ese mismo día puede adelantarse la hora si el profesional está disponible.');
                }
            }
            if (estado === 'concluida_atencion' && actual.estado !== 'atendiendo') {
                throw new Error('Primero debes iniciar la atención.');
            }
            if (estado === 'no_asistio' && actual.estado !== 'pendiente_atencion') {
                throw new Error('Solo se puede registrar inasistencia en una cita pendiente.');
            }
            if (!compararCitas({ ...actual, id }, { ...citaInicial, id })) {
                throw new Error('La cita cambió. Actualiza la agenda antes de continuar.');
            }
            if (!ocupaHorario(estado) && !esEstadoFinal(estado)) {
                throw new Error('Estado de cita no válido.');
            }
            if (esEstadoFinal(estado)) {
                locks.forEach((lock, i) => {
                    if (!lock.exists()) return;
                    const datos = obtenerDatosBloqueo(lock.data());
                    if (datos.tipo !== 'temporal' && datos.citaId === id) {
                        tx.delete(bloqueoRefs[i]);
                    }
                });
            }
            if (estado === 'atendiendo') {
                ocupaciones[medicoKey] = id;
                tx.update(sedeRef, { agendaAtencionesActivas: ocupaciones });
            }
            if (estado === 'concluida_atencion' && ocupaciones[medicoKey] === id) {
                delete ocupaciones[medicoKey];
                tx.update(sedeRef, { agendaAtencionesActivas: ocupaciones });
            }
            if (estado === 'no_asistio') {
                const fechaInasistencia = new Date().toISOString();
                const limite = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
                const seguimiento: CitaSeguimientoInasistencia = {
                    fechaInasistencia,
                    fechaLimiteContacto: limite,
                    estado: 'pendiente',
                    intentos: [],
                    fechaCierre: null,
                };
                tx.update(ref, {
                    estado,
                    seguimientoInasistencia: seguimiento,
                    updatedAt: serverTimestamp(),
                });
            } else {
                tx.update(ref, {
                    estado,
                    updatedAt: serverTimestamp(),
                    ...(estado === 'atendiendo'
                        ? { atencionIniciadaPor: assertSession(), atencionIniciadaEn: new Date().toISOString() }
                        : {}),
                });
            }
        });
    },

    async registrarIntentoContacto(
        citaId: string,
        medio: CitaIntentoContacto['medio'],
        resultado: CitaIntentoContacto['resultado'],
        observacion: string
    ): Promise<void> {
        const uid = assertSession();
        if (!citaId?.trim()) throw new Error('No se identificó la cita.');
        if (!['llamada', 'whatsapp', 'otro'].includes(medio)) {
            throw new Error('Medio de contacto inválido.');
        }
        if (!['respondio', 'sin_respuesta'].includes(resultado)) {
            throw new Error('Resultado de contacto inválido.');
        }
        if (observacion.trim().length > 1000) {
            throw new Error('La observación no debe superar los 1000 caracteres.');
        }
        const ref = getCitaRef(citaId);
        await runTransaction(db, async (tx) => {
            const snapshot = await tx.get(ref);
            if (!snapshot.exists()) throw new Error('La cita no existe.');
            const cita = snapshot.data() as Cita;
            if (cita.estado !== 'no_asistio') {
                throw new Error('Solo puedes registrar contactos de una inasistencia.');
            }
            const previo = cita.seguimientoInasistencia;
            if (previo?.estado === 'sin_contacto' || previo?.estado === 'reagendado' || previo?.estado === 'contactado') {
                throw new Error('Este seguimiento está cerrado.');
            }
            if (cita.reprogramadaHacia) {
                throw new Error('La cita ya fue reagendada.');
            }
            const ahora = new Date().toISOString();
            const seguimiento: CitaSeguimientoInasistencia = previo || {
                fechaInasistencia: ahora,
                fechaLimiteContacto: new Date(Date.now() + 3 * 86400000).toISOString(),
                estado: 'pendiente',
                intentos: [],
                fechaCierre: null,
            };
            if (Date.now() >= Date.parse(seguimiento.fechaLimiteContacto)) {
                throw new Error('Transcurrieron los tres días de seguimiento. Cierra el seguimiento sin contacto.');
            }
            const intento: CitaIntentoContacto = {
                fecha: ahora,
                medio,
                resultado,
                observacion: observacion.trim(),
                registradoPor: uid,
            };
            tx.update(ref, {
                seguimientoInasistencia: {
                    ...seguimiento,
                    estado: resultado === 'respondio' ? 'contactado' : 'pendiente',
                    intentos: [...(seguimiento.intentos || []), intento],
                    fechaCierre: resultado === 'respondio' ? ahora : null,
                },
                updatedAt: serverTimestamp(),
            });
        });
    },

    async cerrarSeguimientoSinContacto(citaId: string): Promise<void> {
        assertSession();
        if (!citaId?.trim()) throw new Error('No se identificó la cita.');
        await runTransaction(db, async (tx) => {
            const ref = getCitaRef(citaId);
            const snapshot = await tx.get(ref);
            if (!snapshot.exists()) throw new Error('La cita no existe.');
            const cita = snapshot.data() as Cita;
            const seguimiento = cita.seguimientoInasistencia;
            if (cita.estado !== 'no_asistio' || !seguimiento) {
                throw new Error('Esta cita no tiene un seguimiento de inasistencia abierto.');
            }
            if (cita.reprogramadaHacia || seguimiento.estado !== 'pendiente') {
                throw new Error('El seguimiento ya se encuentra resuelto.');
            }
            if (Date.now() < Date.parse(seguimiento.fechaLimiteContacto)) {
                throw new Error('Aún no han transcurrido los tres días de seguimiento.');
            }
            tx.update(ref, {
                seguimientoInasistencia: {
                    ...seguimiento,
                    estado: 'sin_contacto',
                    fechaCierre: new Date().toISOString(),
                },
                updatedAt: serverTimestamp(),
            });
        });
    },

    async remove(
        _id: string
    ): Promise<void> {
        throw new Error(
            'Las citas no deben eliminarse permanentemente. Utiliza la cancelación para conservar su historial.'
        );
    },
};
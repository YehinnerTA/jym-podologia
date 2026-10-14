import React, { useEffect, useState } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import {
    AppModal,
    AppButton,
    AppInput,
    AppTimePicker,
    AppFormField,
} from '../../../components';
import { useSedeForm } from '../hooks/useSedeForm';
import { sedeService } from '../services/sedeService';
import { Sede } from '../sede';
import { DIAS_LABELS, validateSedeForm, hasErrors } from '../utils/sedeHelpers';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    sede: Sede | null;
    onSuccess: () => void;
}

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

export const SedeForm: React.FC<Props> = ({ isOpen, onClose, sede, onSuccess }) => {
    const { user } = useAuth();

    const {
        data,
        updateField,
        updateHorario,
        setErrors,
        reset,
        getFieldError,
    } = useSedeForm(
        sede
            ? {
                nombre: sede.nombre,
                ruc: sede.ruc,
                direccion: sede.direccion,
                telefono: sede.telefono,
                email: sede.email,
                esPredeterminada: sede.esPredeterminada,
                cuposPorHorario: sede.cuposPorHorario,
                habitaciones: sede.habitaciones,
                horarioAtencion: sede.horarioAtencion,
                activo: sede.activo,
            }
            : undefined
    );

    const [isSaving, setIsSaving] = useState(false);
    const [apiError, setApiError] = useState('');

    useEffect(() => {
        if (isOpen) {
            reset(
                sede
                    ? {
                        nombre: sede.nombre,
                        ruc: sede.ruc,
                        direccion: sede.direccion,
                        telefono: sede.telefono,
                        email: sede.email,
                        esPredeterminada: sede.esPredeterminada,
                        cuposPorHorario: sede.cuposPorHorario,
                        habitaciones: sede.habitaciones,
                        horarioAtencion: sede.horarioAtencion,
                        activo: sede.activo,
                    }
                    : undefined
            );
            setApiError('');
        }
    }, [isOpen, sede, reset]);

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setApiError('');

        // Validación con los datos actuales (no con el hook desincronizado)
        const validationErrors = validateSedeForm(data);

        if (hasErrors(validationErrors)) {
            setErrors(validationErrors);
            setApiError('Revisa los campos marcados en rojo.');
            return;
        }

        setIsSaving(true);
        try {
            if (sede) {
                await sedeService.update(sede.id, data);
            } else {
                const newId = await sedeService.create(data, user?.uid || '');
            }
            onSuccess();
        } catch (error: any) {
            setApiError(error?.message || 'Error al guardar. Intenta nuevamente.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AppModal
            isOpen={isOpen}
            onClose={onClose}
            title={sede ? 'Editar Sede' : 'Nueva Sede'}
            icon="fa-solid fa-hospital"
            size="lg"
            footer={
                <>
                    <AppButton
                        variant="ghost"
                        onClick={onClose}
                        disabled={isSaving}
                    >
                        Cancelar
                    </AppButton>
                    <AppButton
                        variant="primary"
                        type="button"
                        loading={isSaving}
                        onClick={handleSubmit}
                        icon="fa-solid fa-floppy-disk"
                        iconPosition="left"
                    >
                        {sede ? 'Guardar cambios' : 'Crear sede'}
                    </AppButton>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="sede-form">
                {apiError && (
                    <div className="sede-form-api-error">
                        <i className="fa-solid fa-circle-exclamation"></i>
                        <span>{apiError}</span>
                    </div>
                )}

                <div className="sede-form-grid">
                    <AppFormField
                        label="Nombre"
                        labelIcon="fa-solid fa-hospital"
                        required
                        error={getFieldError('nombre')}
                    >
                        <AppInput
                            value={data.nombre}
                            onChange={(v) => updateField('nombre', v)}
                            placeholder="Sede Los Olivos"
                        />
                    </AppFormField>

                    <AppFormField
                        label="RUC"
                        labelIcon="fa-solid fa-id-card"
                        required
                        error={getFieldError('ruc')}
                    >
                        <AppInput
                            value={data.ruc}
                            onChange={(v) => updateField('ruc', v.replace(/\D/g, '').slice(0, 11))}
                            placeholder="20611145587"
                        />
                    </AppFormField>

                    <AppFormField
                        label="Teléfono"
                        labelIcon="fa-solid fa-phone"
                        error={getFieldError('telefono')}
                    >
                        <AppInput
                            value={data.telefono}
                            onChange={(v) => updateField('telefono', v)}
                            placeholder="987654321"
                        />
                    </AppFormField>

                    <AppFormField
                        label="Email"
                        labelIcon="fa-solid fa-envelope"
                        error={getFieldError('email')}
                    >
                        <AppInput
                            value={data.email}
                            onChange={(v) => updateField('email', v)}
                            placeholder="sede@jympodologia.com"
                            type="email"
                        />
                    </AppFormField>

                    <div className="sede-form-full">
                        <AppFormField
                            label="Dirección"
                            labelIcon="fa-solid fa-location-dot"
                            required
                            error={getFieldError('direccion')}
                        >
                            <AppInput
                                value={data.direccion}
                                onChange={(v) => updateField('direccion', v)}
                                placeholder="Av. Ejemplo 123, Distrito, Ciudad"
                            />
                        </AppFormField>
                    </div>

                    <AppFormField
                        label="Cupos por horario"
                        labelIcon="fa-solid fa-users"
                        required
                        error={getFieldError('cuposPorHorario')}
                    >
                        <AppInput
                            type="number"
                            value={String(data.cuposPorHorario)}
                            onChange={(v) => updateField('cuposPorHorario', Math.max(1, parseInt(v) || 1))}
                            placeholder="1"
                        />
                    </AppFormField>

                    <AppFormField
                        label="Habitaciones"
                        labelIcon="fa-solid fa-door-open"
                        required
                        error={getFieldError('habitaciones')}
                    >
                        <AppInput
                            type="number"
                            value={String(data.habitaciones)}
                            onChange={(v) => updateField('habitaciones', Math.max(1, parseInt(v) || 1))}
                            placeholder="1"
                        />
                    </AppFormField>
                </div>

                <div className="sede-form-section">
                    <h3 className="sede-form-section-title">
                        <i className="fa-solid fa-clock"></i> Horario de atención
                    </h3>
                    <div className="sede-form-horarios">
                        {DIAS.map((dia) => {
                            const horario = data.horarioAtencion[dia as keyof typeof data.horarioAtencion];
                            const activo = horario !== null;
                            return (
                                <div key={dia} className={`sede-horario-row ${!activo ? 'inactivo' : ''}`}>
                                    <label className="sede-horario-check">
                                        <input
                                            type="checkbox"
                                            checked={activo}
                                            onChange={(e) =>
                                                updateHorario(
                                                    dia,
                                                    e.target.checked ? { inicio: '08:00', fin: '18:00' } : null
                                                )
                                            }
                                        />
                                        <span className="sede-horario-dia">{DIAS_LABELS[dia]}</span>
                                    </label>
                                    {activo && horario && (
                                        <div className="sede-horario-times">
                                            <AppTimePicker
                                                value={horario.inicio}
                                                onChange={(v) => updateHorario(dia, { ...horario, inicio: v })}
                                            />
                                            <span className="sede-horario-sep">a</span>
                                            <AppTimePicker
                                                value={horario.fin}
                                                onChange={(v) => updateHorario(dia, { ...horario, fin: v })}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="sede-form-flags">
                    <label className="sede-form-check">
                        <input
                            type="checkbox"
                            checked={data.esPredeterminada}
                            onChange={(e) => updateField('esPredeterminada', e.target.checked)}
                        />
                        <span>
                            <i className="fa-solid fa-star"></i> Marcar como sede predeterminada
                        </span>
                    </label>

                    <label className="sede-form-check">
                        <input
                            type="checkbox"
                            checked={data.activo}
                            onChange={(e) => updateField('activo', e.target.checked)}
                        />
                        <span>
                            <i className="fa-solid fa-circle-check"></i> Sede activa
                        </span>
                    </label>
                </div>
            </form>
        </AppModal>
    );
};
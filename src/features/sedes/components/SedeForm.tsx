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

import {
    Sede,
    SedeFormData,
    DiaSemana,
} from '../sede';

import {
    DIAS_LABELS,
    validateSedeForm,
    hasErrors,
} from '../utils/sedeHelpers';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    sede: Sede | null;
    onSuccess: () => void;
}

const DIAS: DiaSemana[] = [
    'lunes',
    'martes',
    'miercoles',
    'jueves',
    'viernes',
    'sabado',
    'domingo',
];

const getSedeFormData = (
    sede: Sede
): SedeFormData => ({
    nombre: sede.nombre,
    direccion: sede.direccion,
    telefono: sede.telefono,
    email: sede.email,
    esPredeterminada: sede.esPredeterminada,
    cuposPorHorario: sede.cuposPorHorario,
    habitaciones: sede.habitaciones,
    horarioAtencion: sede.horarioAtencion,
    activo: sede.activo,
});

export const SedeForm: React.FC<Props> = ({
    isOpen,
    onClose,
    sede,
    onSuccess,
}) => {
    const {
        user,
        role,
        isAuthenticated,
        isLoading: authLoading,
    } = useAuth();

    const {
        data,
        updateField,
        updateHorario,
        setErrors,
        reset,
        getFieldError,
    } = useSedeForm(
        sede ? getSedeFormData(sede) : undefined
    );

    const [isSaving, setIsSaving] = useState(false);
    const [apiError, setApiError] = useState('');

    const canManageSedes =
        isAuthenticated &&
        role === 'admin' &&
        !!user;

    useEffect(() => {
        if (!isOpen) return;

        reset(
            sede ? getSedeFormData(sede) : undefined
        );

        setApiError('');
    }, [
        isOpen,
        sede,
        reset,
    ]);

    const handleSubmit = async (
        event?: React.FormEvent
    ) => {
        event?.preventDefault();

        if (isSaving) return;

        setApiError('');

        // Solo administradores autenticados
        // pueden crear o editar sedes.
        if (authLoading || !canManageSedes || !user) {
            setApiError(
                'No tienes permisos para administrar sedes.'
            );
            return;
        }

        const validationErrors =
            validateSedeForm(data);

        if (hasErrors(validationErrors)) {
            setErrors(validationErrors);
            setApiError(
                'Revisa los campos marcados en rojo.'
            );
            return;
        }

        setIsSaving(true);

        try {
            if (sede) {
                await sedeService.update(
                    sede.id,
                    data
                );
            } else {
                await sedeService.create(
                    data,
                    user.uid
                );
            }

            onSuccess();
        } catch (error: unknown) {
            console.error(
                'Error guardando sede:',
                error
            );

            setApiError(
                error instanceof Error
                    ? error.message
                    : 'Error al guardar. Intenta nuevamente.'
            );
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AppModal
            isOpen={isOpen}
            onClose={onClose}
            title={
                sede
                    ? 'Editar Sede'
                    : 'Nueva Sede'
            }
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
                        disabled={
                            authLoading ||
                            !canManageSedes
                        }
                        onClick={handleSubmit}
                        icon="fa-solid fa-floppy-disk"
                        iconPosition="left"
                    >
                        {sede
                            ? 'Guardar cambios'
                            : 'Crear sede'}
                    </AppButton>
                </>
            }
        >
            <form
                onSubmit={handleSubmit}
                className="sede-form"
            >
                {apiError && (
                    <div
                        className="sede-form-api-error"
                        role="alert"
                    >
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
                            onChange={(value) =>
                                updateField(
                                    'nombre',
                                    value
                                )
                            }
                            placeholder="Sede Los Olivos"
                        />
                    </AppFormField>

                    <AppFormField
                        label="Teléfono"
                        labelIcon="fa-solid fa-phone"
                        error={getFieldError('telefono')}
                    >
                        <AppInput
                            value={data.telefono}
                            onChange={(value) =>
                                updateField(
                                    'telefono',
                                    value
                                )
                            }
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
                            onChange={(value) =>
                                updateField(
                                    'email',
                                    value
                                )
                            }
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
                                onChange={(value) =>
                                    updateField(
                                        'direccion',
                                        value
                                    )
                                }
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
                            value={String(
                                data.cuposPorHorario
                            )}
                            onChange={(value) =>
                                updateField(
                                    'cuposPorHorario',
                                    Math.max(
                                        1,
                                        parseInt(
                                            value,
                                            10
                                        ) || 1
                                    )
                                )
                            }
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
                            value={String(
                                data.habitaciones
                            )}
                            onChange={(value) =>
                                updateField(
                                    'habitaciones',
                                    Math.max(
                                        1,
                                        parseInt(
                                            value,
                                            10
                                        ) || 1
                                    )
                                )
                            }
                            placeholder="1"
                        />
                    </AppFormField>
                </div>

                <div className="sede-form-section">
                    <h3 className="sede-form-section-title">
                        <i className="fa-solid fa-clock"></i>
                        {' '}Horario de atención
                    </h3>

                    <div className="sede-form-horarios">
                        {DIAS.map((dia) => {
                            const horario =
                                data.horarioAtencion?.[
                                dia
                                ] ?? null;

                            const activo =
                                horario !== null;

                            return (
                                <div
                                    key={dia}
                                    className={`sede-horario-row ${!activo
                                        ? 'inactivo'
                                        : ''
                                        }`}
                                >
                                    <label className="sede-horario-check">
                                        <input
                                            type="checkbox"
                                            checked={activo}
                                            onChange={(
                                                event
                                            ) =>
                                                updateHorario(
                                                    dia,
                                                    event
                                                        .target
                                                        .checked
                                                        ? {
                                                            inicio:
                                                                '08:00',
                                                            fin:
                                                                '18:00',
                                                        }
                                                        : null
                                                )
                                            }
                                        />

                                        <span className="sede-horario-dia">
                                            {
                                                DIAS_LABELS[
                                                dia
                                                ]
                                            }
                                        </span>
                                    </label>

                                    {activo &&
                                        horario && (
                                            <div className="sede-horario-times">
                                                <AppTimePicker
                                                    value={
                                                        horario.inicio
                                                    }
                                                    onChange={(
                                                        value
                                                    ) =>
                                                        updateHorario(
                                                            dia,
                                                            {
                                                                ...horario,
                                                                inicio:
                                                                    value,
                                                            }
                                                        )
                                                    }
                                                />

                                                <span className="sede-horario-sep">
                                                    a
                                                </span>

                                                <AppTimePicker
                                                    value={
                                                        horario.fin
                                                    }
                                                    onChange={(
                                                        value
                                                    ) =>
                                                        updateHorario(
                                                            dia,
                                                            {
                                                                ...horario,
                                                                fin:
                                                                    value,
                                                            }
                                                        )
                                                    }
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
                            checked={
                                data.esPredeterminada
                            }
                            onChange={(event) =>
                                updateField(
                                    'esPredeterminada',
                                    event.target
                                        .checked
                                )
                            }
                        />

                        <span>
                            <i className="fa-solid fa-star"></i>
                            {' '}Marcar como sede predeterminada
                        </span>
                    </label>

                    <label className="sede-form-check">
                        <input
                            type="checkbox"
                            checked={data.activo}
                            onChange={(event) =>
                                updateField(
                                    'activo',
                                    event.target
                                        .checked
                                )
                            }
                        />

                        <span>
                            <i className="fa-solid fa-circle-check"></i>
                            {' '}Sede activa
                        </span>
                    </label>
                </div>
            </form>
        </AppModal>
    );
};
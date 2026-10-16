import React, { useEffect, useMemo, useState } from 'react';

import {
    AppModal,
    AppButton,
    AppInput,
    AppSelect,
    AppTextarea,
    AppFormField,
} from '../../../components';

import { useAuth } from '../../auth/context/AuthContext';
import { useCompany } from '../../company/context/CompanyContext';

import {
    Servicio,
    ServicioCategoria,
    ServicioFormData,
    SERVICIO_CATEGORIA_LABELS,
} from '../service';

import { useServiceForm } from '../hooks/useServiceForm';
import { serviceService } from '../services/serviceService';

import {
    validateServiceForm,
    hasServiceErrors,
    buildServiceSedesIds,
} from '../utils/serviceHelpers';

import '../services.css';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    servicio: Servicio | null;
    onSuccess: () => void;
}

export const ServiceForm: React.FC<Props> = ({
    isOpen,
    onClose,
    servicio,
    onSuccess,
}) => {
    const {
        user,
        role,
        sedesIds: sedesUsuarioIds,
    } = useAuth();

    const { sedes, selectedSede } = useCompany();

    const {
        data,
        updateField,
        toggleSede,
        selectAllSedes,
        reset,
        getFieldError,
        setErrors,
    } = useServiceForm();

    const [isSaving, setIsSaving] = useState(false);
    const [apiError, setApiError] = useState('');

    const isAdmin = role === 'admin';
    const isEditing = Boolean(servicio);

    const sedesDisponibles = useMemo(() => {
        return sedes.filter(
            (sede) =>
                sede.activo &&
                sedesUsuarioIds.includes(sede.id)
        );
    }, [sedes, sedesUsuarioIds]);

    const sedeActualId = useMemo(() => {
        const sedeEncontrada = sedesDisponibles.find(
            (sede) => sede.id === selectedSede
        );

        if (sedeEncontrada) {
            return sedeEncontrada.id;
        }

        if (sedesDisponibles.length === 1) {
            return sedesDisponibles[0].id;
        }

        return '';
    }, [sedesDisponibles, selectedSede]);

    const sedeActual = sedesDisponibles.find(
        (sede) => sede.id === sedeActualId
    );

    useEffect(() => {
        if (!isOpen) return;

        if (servicio) {
            reset({
                nombre: servicio.nombre,
                descripcion: servicio.descripcion,
                categoria: servicio.categoria,
                duracionMin: servicio.duracionMin,
                precio: servicio.precio,
                sedesIds: [...servicio.sedesIds],
                activo: servicio.activo,
            });
        } else {
            reset();
        }

        setApiError('');
    }, [isOpen, servicio, reset]);

    const sedesSeleccionadas = useMemo(() => {
        if (isEditing) {
            return [...new Set(data.sedesIds)];
        }

        return buildServiceSedesIds(
            sedeActualId,
            data.sedesIds
        );
    }, [
        isEditing,
        data.sedesIds,
        sedeActualId,
    ]);

    const todasSeleccionadas =
        sedesDisponibles.length > 0 &&
        sedesDisponibles.every((sede) =>
            sedesSeleccionadas.includes(sede.id)
        );

    const handleTodasSedes = (checked: boolean) => {
        if (checked) {
            selectAllSedes(
                sedesDisponibles.map((sede) => sede.id)
            );
        } else {
            selectAllSedes([]);
        }
    };

    const handleSubmit = async () => {
        setApiError('');

        if (!isAdmin || !user) {
            setApiError(
                'Solo los administradores pueden gestionar servicios.'
            );
            return;
        }

        if (sedesDisponibles.length === 0) {
            setApiError(
                'Tu usuario no tiene sedes activas vinculadas. Verifica su asignación.'
            );
            return;
        }

        if (!isEditing && !sedeActualId) {
            setApiError(
                'Selecciona una sede autorizada antes de registrar el servicio.'
            );
            return;
        }

        const sedesFinales = isEditing
            ? [...new Set(data.sedesIds)]
            : buildServiceSedesIds(
                sedeActualId,
                data.sedesIds
            );

        const finalData: ServicioFormData = {
            ...data,
            nombre: data.nombre.trim(),
            descripcion: data.descripcion.trim(),
            sedesIds: sedesFinales,
        };

        const validationErrors = validateServiceForm(
            finalData
        );

        setErrors(validationErrors);

        if (hasServiceErrors(validationErrors)) {
            setApiError(
                'Revisa los campos del formulario.'
            );
            return;
        }

        const sedesPermitidas = new Set(
            sedesDisponibles.map((sede) => sede.id)
        );

        const sedesNoPermitidas =
            finalData.sedesIds.filter(
                (id) => !sedesPermitidas.has(id)
            );

        if (sedesNoPermitidas.length > 0) {
            setApiError(
                'El servicio contiene sedes que no están autorizadas para tu usuario.'
            );
            return;
        }

        setIsSaving(true);

        try {
            if (servicio) {
                await serviceService.update(
                    servicio.id,
                    finalData
                );
            } else {
                await serviceService.create(
                    finalData,
                    user.uid
                );
            }

            onSuccess();
        } catch (error: unknown) {
            console.error(
                'Error guardando servicio:',
                error
            );

            setApiError(
                error instanceof Error
                    ? error.message
                    : 'No se pudo guardar el servicio.'
            );
        } finally {
            setIsSaving(false);
        }
    };

    if (!isAdmin) return null;

    return (
        <AppModal
            isOpen={isOpen}
            onClose={onClose}
            title={
                isEditing
                    ? 'Editar servicio'
                    : 'Nuevo servicio'
            }
            icon="fa-solid fa-stethoscope"
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
                        {isEditing
                            ? 'Guardar cambios'
                            : 'Crear servicio'}
                    </AppButton>
                </>
            }
        >
            <form
                className="service-form"
                onSubmit={(e) => e.preventDefault()}
            >
                {apiError && (
                    <div
                        className="service-form-error"
                        role="alert"
                    >
                        <i className="fa-solid fa-circle-exclamation" />
                        <span>{apiError}</span>
                    </div>
                )}

                <h3 className="service-form-section-title">
                    <i className="fa-solid fa-clipboard-list" />
                    Datos del servicio
                </h3>

                <div className="service-form-grid">
                    <AppFormField
                        label="Nombre del servicio"
                        labelIcon="fa-solid fa-stethoscope"
                        required
                        error={getFieldError('nombre')}
                    >
                        <AppInput
                            value={data.nombre}
                            onChange={(value) =>
                                updateField('nombre', value)
                            }
                            placeholder="Ej: Podología clínica"
                        />
                    </AppFormField>

                    <AppFormField
                        label="Categoría"
                        labelIcon="fa-solid fa-layer-group"
                        required
                        error={getFieldError('categoria')}
                    >
                        <AppSelect
                            value={data.categoria}
                            onChange={(value) =>
                                updateField(
                                    'categoria',
                                    value as ServicioCategoria
                                )
                            }
                            options={Object.entries(
                                SERVICIO_CATEGORIA_LABELS
                            ).map(([value, label]) => ({
                                value,
                                label,
                            }))}
                            placeholder="Selecciona categoría"
                        />
                    </AppFormField>

                    <AppFormField
                        label="Duración (minutos)"
                        labelIcon="fa-solid fa-clock"
                        required
                        error={getFieldError('duracionMin')}
                    >
                        <AppInput
                            type="number"
                            value={String(data.duracionMin)}
                            onChange={(value) =>
                                updateField(
                                    'duracionMin',
                                    Number(value)
                                )
                            }
                            placeholder="30"
                        />
                    </AppFormField>

                    <AppFormField
                        label="Precio (S/)"
                        labelIcon="fa-solid fa-money-bill"
                        required
                        error={getFieldError('precio')}
                    >
                        <AppInput
                            type="number"
                            value={String(data.precio)}
                            onChange={(value) =>
                                updateField(
                                    'precio',
                                    Number(value)
                                )
                            }
                            placeholder="0.00"
                        />
                    </AppFormField>

                    <div className="service-form-full">
                        <AppFormField
                            label="Descripción"
                            labelIcon="fa-solid fa-align-left"
                        >
                            <AppTextarea
                                value={data.descripcion}
                                onChange={(value) =>
                                    updateField(
                                        'descripcion',
                                        value
                                    )
                                }
                                placeholder="Descripción del tratamiento"
                                rows={3}
                            />
                        </AppFormField>
                    </div>
                </div>

                <h3 className="service-form-section-title">
                    <i className="fa-solid fa-hospital" />
                    Sedes vinculadas
                </h3>

                {!isEditing && sedeActual ? (
                    <p>
                        El servicio se registrará automáticamente
                        en <strong>{sedeActual.nombre}</strong>.
                        Puedes vincularlo con otras sedes
                        opcionalmente.
                    </p>
                ) : (
                    <p>
                        {isEditing
                            ? 'Selecciona las sedes donde estará disponible este servicio.'
                            : 'Selecciona una sede autorizada desde el encabezado.'}
                    </p>
                )}

                <label className="service-checkbox">
                    <input
                        type="checkbox"
                        checked={todasSeleccionadas}
                        onChange={(e) =>
                            handleTodasSedes(e.target.checked)
                        }
                        disabled={
                            isSaving ||
                            sedesDisponibles.length === 0
                        }
                    />

                    <span>
                        <i className="fa-solid fa-building" />
                        Vincular a todas mis sedes
                    </span>
                </label>

                <div className="service-sedes-grid">
                    {sedesDisponibles.map((sede) => {
                        const esSedeActual =
                            sede.id === sedeActualId;

                        const checked =
                            sedesSeleccionadas.includes(sede.id);

                        return (
                            <label
                                key={sede.id}
                                className="service-sede-check"
                            >
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={
                                        isSaving ||
                                        (!isEditing && esSedeActual)
                                    }
                                    onChange={() =>
                                        toggleSede(sede.id)
                                    }
                                />

                                <span>
                                    {sede.nombre}
                                    {!isEditing &&
                                        esSedeActual &&
                                        ' (sede actual)'}
                                </span>
                            </label>
                        );
                    })}
                </div>

                {sedesDisponibles.length === 0 && (
                    <div className="service-form-error">
                        <i className="fa-solid fa-circle-exclamation" />
                        <span>
                            No tienes sedes activas asignadas.
                        </span>
                    </div>
                )}

                {getFieldError('sedesIds') && (
                    <div className="service-form-error">
                        <i className="fa-solid fa-circle-exclamation" />
                        <span>
                            {getFieldError('sedesIds')}
                        </span>
                    </div>
                )}

                <div className="service-form-flags">
                    <label className="service-checkbox">
                        <input
                            type="checkbox"
                            checked={data.activo}
                            disabled={isSaving}
                            onChange={(e) =>
                                updateField(
                                    'activo',
                                    e.target.checked
                                )
                            }
                        />

                        <span>
                            <i className="fa-solid fa-circle-check" />
                            Servicio activo
                        </span>
                    </label>
                </div>
            </form>
        </AppModal>
    );
};
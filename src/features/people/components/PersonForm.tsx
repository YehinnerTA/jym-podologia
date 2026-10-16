import React, { useEffect, useState } from 'react';

import { useAuth } from '../../auth/context/AuthContext';
import { useCompany } from '../../company/context/CompanyContext';

import {
    AppModal,
    AppButton,
    AppInput,
    AppSelect,
    AppTextarea,
    AppDatePicker,
    AppFormField,
} from '../../../components';

import { usePersonForm } from '../hooks/usePersonForm';
import { personService } from '../services/personService';

import {
    Persona,
    PersonaTipo,
    PersonaFormData,
} from '../person';

import {
    validatePersonForm,
    hasErrors,
} from '../utils/personHelpers';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    persona: Persona | null;
    onSuccess: () => void;
}

const normalizarFecha = (fecha?: string): string => {
    if (
        typeof fecha === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(fecha)
    ) {
        return fecha;
    }

    return '';
};

const getPersonaFormData = (
    persona: Persona
): PersonaFormData => ({
    tipo: persona.tipo,
    nombre: persona.nombre,
    dni: persona.dni,
    fechaNacimiento: normalizarFecha(
        persona.fechaNacimiento
    ),
    genero: persona.genero,
    whatsapp: persona.whatsapp,
    email: persona.email,
    direccion: persona.direccion,
    sedesIds: persona.sedesIds || [],
    especialidad: persona.especialidad,
    numeroColegiatura: persona.numeroColegiatura,
    alergias: persona.alergias,
    antecedentes: persona.antecedentes,
    notas: persona.notas,
    esTrabajador: persona.esTrabajador,
    username: persona.username || '',
    activo: persona.activo,
});

export const PersonForm: React.FC<Props> = ({
    isOpen,
    onClose,
    persona,
    onSuccess,
}) => {
    const {
        user,
        role,
    } = useAuth();

    const {
        sedes,
        selectedSede,
        isLoading: sedesLoading,
    } = useCompany();

    const isAdmin = role === 'admin';
    const isStaff = role === 'staff';
    const isEditing = !!persona;

    const {
        data,
        password,
        setPassword,
        updateField,
        toggleSede,
        reset,
        getFieldError,
        setErrors,
    } = usePersonForm(
        persona
            ? getPersonaFormData(persona)
            : undefined
    );

    const [isSaving, setIsSaving] = useState(false);
    const [apiError, setApiError] = useState('');

    // Solamente un administrador puede
    // visualizar y registrar trabajadores.
    const puedeGestionarTrabajadores = isAdmin;

    // En cuentas staff el formulario es
    // exclusivamente para pacientes.
    const esTrabajador =
        isAdmin && data.esTrabajador;

    const esAdministrador =
        esTrabajador &&
        data.tipo === 'admin';

    const requiereNuevaCuenta =
        esTrabajador &&
        !isEditing;

    const sedesDisponibles = sedes.filter(
        (sede) => sede.activo
    );

    // Protección adicional para impedir
    // editar trabajadores desde una sesión staff.
    const accesoPermitido =
        isAdmin ||
        (
            isStaff &&
            (
                !persona ||
                (
                    persona.tipo === 'paciente' &&
                    persona.esTrabajador !== true
                )
            )
        );

    useEffect(() => {
        if (!isOpen) return;

        reset(
            persona
                ? getPersonaFormData(persona)
                : undefined
        );

        setApiError('');
    }, [
        isOpen,
        persona,
        reset,
    ]);

    // Cuando un trabajador no administrador
    // abre un formulario nuevo, aseguramos
    // que el tipo sea paciente.
    useEffect(() => {
        if (
            !isOpen ||
            !isStaff ||
            persona
        ) {
            return;
        }

        if (data.tipo !== 'paciente') {
            updateField(
                'tipo',
                'paciente'
            );
        }

        if (data.esTrabajador) {
            updateField(
                'esTrabajador',
                false
            );
        }
    }, [
        isOpen,
        isStaff,
        persona,
        data.tipo,
        data.esTrabajador,
        updateField,
    ]);

    const handleSubmit = async () => {
        if (isSaving) return;

        setApiError('');

        if (!user) {
            setApiError(
                'Tu sesión no es válida. Inicia sesión nuevamente.'
            );
            return;
        }

        if (!accesoPermitido) {
            setApiError(
                'No tienes permisos para modificar este registro.'
            );
            return;
        }

        if (!isAdmin && !isStaff) {
            setApiError(
                'No tienes permisos para registrar personas.'
            );
            return;
        }

        if (sedesLoading) {
            setApiError(
                'Las sedes todavía se están cargando.'
            );
            return;
        }

        // STAFF:
        // Forzamos que los datos enviados sean
        // de un paciente sin acceso al sistema.
        //
        // ADMIN:
        // Conservamos los datos seleccionados
        // en el formulario.
        let datosFinales: PersonaFormData =
            isStaff
                ? {
                    ...data,
                    tipo: 'paciente',
                    esTrabajador: false,
                    username: '',
                    sedesIds: [],
                }
                : {
                    ...data,
                };

        // Los administradores obtienen
        // automáticamente todas las sedes.
        //
        // El servicio recalcula esas sedes,
        // incluyendo las inactivas.
        if (
            isAdmin &&
            datosFinales.esTrabajador &&
            datosFinales.tipo === 'admin'
        ) {
            datosFinales = {
                ...datosFinales,
                sedesIds: [
                    ...new Set(
                        sedesDisponibles.map(
                            (sede) => sede.id
                        )
                    ),
                ],
            };
        }

        const validationErrors =
            validatePersonForm(
                datosFinales,
                requiereNuevaCuenta
                    ? password
                    : undefined
            );

        // Al editar no se necesita volver
        // a introducir la contraseña.
        if (hasErrors(validationErrors)) {
            setErrors(validationErrors);

            setApiError(
                'Revisa los campos marcados en rojo.'
            );
            return;
        }

        if (
            requiereNuevaCuenta &&
            (
                !datosFinales.username?.trim() ||
                password.length < 6
            )
        ) {
            setApiError(
                'El correo y la contraseña son obligatorios para crear una cuenta de trabajador.'
            );
            return;
        }

        setIsSaving(true);

        try {
            if (persona) {
                await personService.update(
                    persona.id,
                    datosFinales
                );
            } else {
                await personService.create(
                    datosFinales,
                    user.uid,
                    requiereNuevaCuenta
                        ? password
                        : undefined,
                    !datosFinales.esTrabajador
                        ? (selectedSede || undefined)
                        : undefined
                );
            }

            // usePeople actualiza el listado
            // automáticamente con onSnapshot.
            onSuccess();

        } catch (error: unknown) {
            console.error(
                'Error guardando persona:',
                error
            );

            setApiError(
                error instanceof Error
                    ? error.message
                    : 'No se pudo guardar la persona.'
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
                isAdmin
                    ? (
                        persona
                            ? 'Editar Persona'
                            : 'Nueva Persona'
                    )
                    : (
                        persona
                            ? 'Editar Paciente'
                            : 'Nuevo Paciente'
                    )
            }
            icon="fa-solid fa-user"
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
                        {persona
                            ? 'Guardar cambios'
                            : (
                                isAdmin
                                    ? 'Crear persona'
                                    : 'Registrar paciente'
                            )}
                    </AppButton>
                </>
            }
        >
            <form
                className="person-form"
                onSubmit={(event) => {
                    event.preventDefault();
                    void handleSubmit();
                }}
            >
                {apiError && (
                    <div
                        className="person-form-api-error"
                        role="alert"
                    >
                        <i className="fa-solid fa-circle-exclamation"></i>
                        <span>{apiError}</span>
                    </div>
                )}

                {!accesoPermitido && (
                    <div
                        className="person-form-api-error"
                        role="alert"
                    >
                        <i className="fa-solid fa-lock"></i>
                        <span>
                            No tienes permisos para editar
                            este tipo de persona.
                        </span>
                    </div>
                )}

                {/* Solo ADMIN puede decidir
                    si se registra un trabajador. */}
                {puedeGestionarTrabajadores && (
                    <div className="person-form-worker-toggle">
                        <label className="person-checkbox">
                            <input
                                type="checkbox"
                                checked={data.esTrabajador}
                                onChange={(event) => {
                                    const checked =
                                        event.target.checked;

                                    updateField(
                                        'esTrabajador',
                                        checked
                                    );

                                    if (!checked) {
                                        updateField(
                                            'tipo',
                                            'paciente'
                                        );
                                    } else if (
                                        data.tipo === 'paciente'
                                    ) {
                                        updateField(
                                            'tipo',
                                            'recepcionista'
                                        );
                                    }
                                }}
                            />
                            <span>
                                <i className="fa-solid fa-briefcase"></i>
                                {' '}Es trabajador de J&M Podología
                            </span>
                        </label>
                    </div>
                )}

                {/* Tipos de trabajador:
                    únicamente para ADMIN. */}
                {puedeGestionarTrabajadores &&
                    esTrabajador && (
                        <div className="person-form-grid">
                            <div className="person-form-full">
                                <AppFormField
                                    label="Tipo"
                                    labelIcon="fa-solid fa-user-tag"
                                    required
                                >
                                    <AppSelect
                                        value={data.tipo}
                                        onChange={(value) =>
                                            updateField(
                                                'tipo',
                                                value as PersonaTipo
                                            )
                                        }
                                        options={[
                                            {
                                                value: 'medico',
                                                label: 'Médico',
                                            },
                                            {
                                                value: 'recepcionista',
                                                label: 'Recepcionista',
                                            },
                                            {
                                                value: 'admin',
                                                label: 'Administrador',
                                            },
                                        ]}
                                        placeholder="Selecciona tipo"
                                    />
                                </AppFormField>
                            </div>
                        </div>
                    )}

                {/* Datos personales */}
                <h3 className="person-form-section-title">
                    <i className="fa-solid fa-user"></i>
                    {' '}Datos personales
                </h3>

                <div className="person-form-grid">
                    <AppFormField
                        label="Nombre completo"
                        labelIcon="fa-solid fa-user"
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
                            placeholder="Juan Pérez"
                        />
                    </AppFormField>

                    <AppFormField
                        label="DNI"
                        labelIcon="fa-solid fa-id-card"
                        required
                        error={getFieldError('dni')}
                    >
                        <AppInput
                            value={data.dni}
                            onChange={(value) =>
                                updateField(
                                    'dni',
                                    value
                                        .replace(/\D/g, '')
                                        .slice(0, 8)
                                )
                            }
                            placeholder="12345678"
                        />
                    </AppFormField>

                    <AppFormField
                        label="Fecha de nacimiento"
                        labelIcon="fa-solid fa-cake-candles"
                    >
                        <AppDatePicker
                            value={data.fechaNacimiento}
                            onChange={(value) =>
                                updateField(
                                    'fechaNacimiento',
                                    value
                                )
                            }
                        />
                    </AppFormField>

                    <AppFormField
                        label="Género"
                        labelIcon="fa-solid fa-venus-mars"
                    >
                        <AppSelect
                            value={data.genero}
                            onChange={(value) =>
                                updateField(
                                    'genero',
                                    value as PersonaFormData['genero']
                                )
                            }
                            options={[
                                {
                                    value: 'M',
                                    label: 'Masculino',
                                },
                                {
                                    value: 'F',
                                    label: 'Femenino',
                                },
                                {
                                    value: 'otro',
                                    label: 'Otro',
                                },
                            ]}
                            placeholder="Selecciona"
                        />
                    </AppFormField>

                    <AppFormField
                        label="WhatsApp"
                        labelIcon="fa-brands fa-whatsapp"
                        required
                        error={getFieldError('whatsapp')}
                    >
                        <AppInput
                            value={data.whatsapp}
                            onChange={(value) =>
                                updateField(
                                    'whatsapp',
                                    value
                                )
                            }
                            placeholder="+51910123456"
                        />
                    </AppFormField>

                    {/* Email de contacto de pacientes */}
                    {!esTrabajador && (
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
                                placeholder="ejemplo@correo.com"
                                type="email"
                            />
                        </AppFormField>
                    )}

                    <div className="person-form-full">
                        <AppFormField
                            label="Dirección"
                            labelIcon="fa-solid fa-location-dot"
                        >
                            <AppInput
                                value={data.direccion}
                                onChange={(value) =>
                                    updateField(
                                        'direccion',
                                        value
                                    )
                                }
                                placeholder="Av. Ejemplo 123"
                            />
                        </AppFormField>
                    </div>
                </div>

                {/* Datos profesionales:
                    solo ADMIN gestiona médicos. */}
                {isAdmin &&
                    esTrabajador &&
                    data.tipo === 'medico' && (
                        <>
                            <h3 className="person-form-section-title">
                                <i className="fa-solid fa-user-doctor"></i>
                                {' '}Datos profesionales
                            </h3>

                            <div className="person-form-grid">
                                <AppFormField
                                    label="Especialidad"
                                    labelIcon="fa-solid fa-stethoscope"
                                    required
                                    error={getFieldError('especialidad')}
                                >
                                    <AppInput
                                        value={data.especialidad}
                                        onChange={(value) =>
                                            updateField(
                                                'especialidad',
                                                value
                                            )
                                        }
                                        placeholder="Podología"
                                    />
                                </AppFormField>

                                <AppFormField
                                    label="N° Colegiatura"
                                    labelIcon="fa-solid fa-id-badge"
                                    required
                                    error={getFieldError('numeroColegiatura')}
                                >
                                    <AppInput
                                        value={data.numeroColegiatura}
                                        onChange={(value) =>
                                            updateField(
                                                'numeroColegiatura',
                                                value
                                            )
                                        }
                                        placeholder="CPP-12345"
                                    />
                                </AppFormField>
                            </div>
                        </>
                    )}

                {/* Información médica del paciente */}
                {!esTrabajador && (
                    <>
                        <h3 className="person-form-section-title">
                            <i className="fa-solid fa-notes-medical"></i>
                            {' '}Información médica
                        </h3>

                        <div className="person-form-grid">
                            <AppFormField
                                label="Alergias"
                                labelIcon="fa-solid fa-triangle-exclamation"
                            >
                                <AppTextarea
                                    value={data.alergias}
                                    onChange={(value) =>
                                        updateField(
                                            'alergias',
                                            value
                                        )
                                    }
                                    placeholder="Ej: Penicilina"
                                    rows={2}
                                />
                            </AppFormField>

                            <AppFormField
                                label="Antecedentes"
                                labelIcon="fa-solid fa-clock-rotate-left"
                            >
                                <AppTextarea
                                    value={data.antecedentes}
                                    onChange={(value) =>
                                        updateField(
                                            'antecedentes',
                                            value
                                        )
                                    }
                                    rows={2}
                                />
                            </AppFormField>

                            <div className="person-form-full">
                                <AppFormField
                                    label="Notas"
                                    labelIcon="fa-solid fa-note-sticky"
                                >
                                    <AppTextarea
                                        value={data.notas}
                                        onChange={(value) =>
                                            updateField(
                                                'notas',
                                                value
                                            )
                                        }
                                        rows={2}
                                    />
                                </AppFormField>
                            </div>
                        </div>
                    </>
                )}

                {/* Acceso al sistema:
                    EXCLUSIVO DE ADMIN. */}
                {isAdmin && esTrabajador && (
                    <>
                        <h3 className="person-form-section-title">
                            <i className="fa-solid fa-briefcase"></i>
                            {' '}Acceso al sistema
                        </h3>

                        <div className="person-form-grid">
                            <AppFormField
                                label="Usuario (email)"
                                labelIcon="fa-solid fa-at"
                                required
                                error={getFieldError('username')}
                            >
                                <AppInput
                                    value={data.username || ''}
                                    onChange={(value) =>
                                        updateField(
                                            'username',
                                            value
                                        )
                                    }
                                    placeholder="medico@jympodologia.com"
                                    type="email"
                                    disabled={isEditing}
                                />
                            </AppFormField>

                            {!isEditing && (
                                <AppFormField
                                    label="Contraseña temporal"
                                    labelIcon="fa-solid fa-key"
                                    required
                                    error={getFieldError('password')}
                                >
                                    <AppInput
                                        value={password}
                                        onChange={setPassword}
                                        placeholder="Mínimo 6 caracteres"
                                        type="password"
                                    />
                                </AppFormField>
                            )}
                        </div>

                        <h3 className="person-form-section-title">
                            <i className="fa-solid fa-hospital"></i>
                            {' '}Sedes asignadas
                        </h3>

                        {esAdministrador ? (
                            <div className="person-sedes-grid">
                                <div className="person-sede-check">
                                    <i className="fa-solid fa-circle-check"></i>
                                    <span>
                                        Acceso automático a todas las sedes
                                        de J&M Podología.
                                    </span>
                                </div>

                                {sedesDisponibles.map((sede) => (
                                    <div
                                        key={sede.id}
                                        className="person-sede-check"
                                    >
                                        <i className="fa-solid fa-hospital"></i>
                                        <span>{sede.nombre}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="person-sedes-grid">
                                {sedesDisponibles.map((sede) => (
                                    <label
                                        key={sede.id}
                                        className="person-sede-check"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={
                                                data.sedesIds.includes(
                                                    sede.id
                                                )
                                            }
                                            onChange={() =>
                                                toggleSede(
                                                    sede.id
                                                )
                                            }
                                        />

                                        <span>
                                            {sede.nombre}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}

                        {getFieldError('sedesIds') &&
                            !esAdministrador && (
                                <div
                                    className="person-form-api-error"
                                    style={{
                                        marginTop: '0.5rem',
                                    }}
                                >
                                    <i className="fa-solid fa-circle-exclamation"></i>
                                    <span>
                                        {getFieldError('sedesIds')}
                                    </span>
                                </div>
                            )}
                    </>
                )}

                {/* Estado de la persona */}
                <div className="person-form-flags">
                    <label className="person-checkbox">
                        <input
                            type="checkbox"
                            checked={data.activo}
                            onChange={(event) =>
                                updateField(
                                    'activo',
                                    event.target.checked
                                )
                            }
                        />

                        <span>
                            <i className="fa-solid fa-circle-check"></i>
                            {' '}Persona activa
                        </span>
                    </label>
                </div>
            </form>
        </AppModal>
    );
};
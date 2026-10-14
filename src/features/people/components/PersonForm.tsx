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
import { Persona, PersonaTipo } from '../person';
import { validatePersonForm, hasErrors } from '../utils/personHelpers';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    persona: Persona | null;
    onSuccess: () => void;
}

export const PersonForm: React.FC<Props> = ({ isOpen, onClose, persona, onSuccess }) => {
    const { user } = useAuth();
    const { sedes } = useCompany();

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
            ? {
                tipo: persona.tipo,
                nombre: persona.nombre,
                dni: persona.dni,
                fechaNacimiento: persona.fechaNacimiento,
                genero: persona.genero,
                whatsapp: persona.whatsapp,
                email: persona.email,
                direccion: persona.direccion,
                sedesIds: persona.sedesIds,
                especialidad: persona.especialidad,
                numeroColegiatura: persona.numeroColegiatura,
                alergias: persona.alergias,
                antecedentes: persona.antecedentes,
                notas: persona.notas,
                esTrabajador: persona.esTrabajador,
                username: persona.username || '',
                activo: persona.activo,
            }
            : undefined
    );

    const [isSaving, setIsSaving] = useState(false);
    const [apiError, setApiError] = useState('');

    useEffect(() => {
        if (isOpen) {
            reset(
                persona
                    ? {
                        tipo: persona.tipo,
                        nombre: persona.nombre,
                        dni: persona.dni,
                        fechaNacimiento: persona.fechaNacimiento,
                        genero: persona.genero,
                        whatsapp: persona.whatsapp,
                        email: persona.email,
                        direccion: persona.direccion,
                        sedesIds: persona.sedesIds,
                        especialidad: persona.especialidad,
                        numeroColegiatura: persona.numeroColegiatura,
                        alergias: persona.alergias,
                        antecedentes: persona.antecedentes,
                        notas: persona.notas,
                        esTrabajador: persona.esTrabajador,
                        username: persona.username || '',
                        activo: persona.activo,
                    }
                    : undefined
            );
            setApiError('');
        }
    }, [isOpen, persona, reset]);

    const handleSubmit = async () => {
        setApiError('');
        const validationErrors = validatePersonForm(data, data.esTrabajador ? password : undefined);
        if (hasErrors(validationErrors)) {
            setErrors(validationErrors);
            setApiError('Revisa los campos marcados en rojo.');
            return;
        }

        setIsSaving(true);
        try {
            if (persona) {
                await personService.update(persona.id, data);
            } else {
                await personService.create(data, user?.uid || '', password);
            }
            onSuccess();
        } catch (error: any) {
            console.error('Error guardando persona:', error);
            setApiError(error?.message || 'Error al guardar.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AppModal
            isOpen={isOpen}
            onClose={onClose}
            title={persona ? 'Editar Persona' : 'Nueva Persona'}
            icon="fa-solid fa-user"
            size="lg"
            footer={
                <>
                    <AppButton variant="ghost" onClick={onClose} disabled={isSaving}>
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
                        {persona ? 'Guardar cambios' : 'Crear persona'}
                    </AppButton>
                </>
            }
        >
            <form className="person-form" onSubmit={(e) => e.preventDefault()}>
                {apiError && (
                    <div className="person-form-api-error">
                        <i className="fa-solid fa-circle-exclamation"></i>
                        <span>{apiError}</span>
                    </div>
                )}

                {/* ¿Es trabajador? */}
                <div className="person-form-worker-toggle">
                    <label className="person-checkbox">
                        <input
                            type="checkbox"
                            checked={data.esTrabajador}
                            onChange={(e) => updateField('esTrabajador', e.target.checked)}
                        />
                        <span>
                            <i className="fa-solid fa-briefcase"></i> Es trabajador de J&M Podología
                        </span>
                    </label>
                </div>

                {/* Tipo: solo si es trabajador */}
                {data.esTrabajador && (
                    <div className="person-form-grid">
                        <div className="person-form-full">
                            <AppFormField label="Tipo" labelIcon="fa-solid fa-user-tag" required>
                                <AppSelect
                                    value={data.tipo}
                                    onChange={(v) => updateField('tipo', v as PersonaTipo)}
                                    options={[
                                        { value: 'medico', label: 'Médico' },
                                        { value: 'recepcionista', label: 'Recepcionista' },
                                        { value: 'admin', label: 'Administrador' },
                                    ]}
                                    placeholder="Selecciona tipo"
                                />
                            </AppFormField>
                        </div>
                    </div>
                )}

                {/* Datos personales */}
                <h3 className="person-form-section-title">
                    <i className="fa-solid fa-user"></i> Datos personales
                </h3>
                <div className="person-form-grid">
                    <AppFormField label="Nombre completo" labelIcon="fa-solid fa-user" required error={getFieldError('nombre')}>
                        <AppInput value={data.nombre} onChange={(v) => updateField('nombre', v)} placeholder="Juan Pérez" />
                    </AppFormField>

                    <AppFormField label="DNI" labelIcon="fa-solid fa-id-card" required error={getFieldError('dni')}>
                        <AppInput
                            value={data.dni}
                            onChange={(v) => updateField('dni', v.replace(/\D/g, '').slice(0, 8))}
                            placeholder="12345678"
                        />
                    </AppFormField>

                    <AppFormField label="Fecha de nacimiento" labelIcon="fa-solid fa-cake-candles">
                        <AppDatePicker value={data.fechaNacimiento} onChange={(v) => updateField('fechaNacimiento', v)} />
                    </AppFormField>

                    <AppFormField label="Género" labelIcon="fa-solid fa-venus-mars">
                        <AppSelect
                            value={data.genero}
                            onChange={(v) => updateField('genero', v as any)}
                            options={[
                                { value: 'M', label: 'Masculino' },
                                { value: 'F', label: 'Femenino' },
                                { value: 'otro', label: 'Otro' },
                            ]}
                            placeholder="Selecciona"
                        />
                    </AppFormField>

                    <AppFormField label="WhatsApp" labelIcon="fa-brands fa-whatsapp" required error={getFieldError('whatsapp')}>
                        <AppInput
                            value={data.whatsapp}
                            onChange={(v) => updateField('whatsapp', v)}
                            placeholder="+51910123456"
                        />
                    </AppFormField>

                    {/* Email: solo si NO es trabajador */}
                    {!data.esTrabajador && (
                        <AppFormField label="Email" labelIcon="fa-solid fa-envelope" error={getFieldError('email')}>
                            <AppInput
                                value={data.email}
                                onChange={(v) => updateField('email', v)}
                                placeholder="ejemplo@correo.com"
                                type="email"
                            />
                        </AppFormField>
                    )}

                    <div className="person-form-full">
                        <AppFormField label="Dirección" labelIcon="fa-solid fa-location-dot">
                            <AppInput value={data.direccion} onChange={(v) => updateField('direccion', v)} placeholder="Av. Ejemplo 123" />
                        </AppFormField>
                    </div>
                </div>

                {/* Médico: especialidad y colegiatura */}
                {data.tipo === 'medico' && (
                    <>
                        <h3 className="person-form-section-title">
                            <i className="fa-solid fa-user-doctor"></i> Datos profesionales
                        </h3>
                        <div className="person-form-grid">
                            <AppFormField label="Especialidad" labelIcon="fa-solid fa-stethoscope" required error={getFieldError('especialidad')}>
                                <AppInput value={data.especialidad} onChange={(v) => updateField('especialidad', v)} placeholder="Podología" />
                            </AppFormField>
                            <AppFormField label="N° Colegiatura" labelIcon="fa-solid fa-id-badge" required error={getFieldError('numeroColegiatura')}>
                                <AppInput value={data.numeroColegiatura} onChange={(v) => updateField('numeroColegiatura', v)} placeholder="CPP-12345" />
                            </AppFormField>
                        </div>
                    </>
                )}

                {/* Paciente: info médica */}
                {data.tipo === 'paciente' && (
                    <>
                        <h3 className="person-form-section-title">
                            <i className="fa-solid fa-notes-medical"></i> Información médica
                        </h3>
                        <div className="person-form-grid">
                            <AppFormField label="Alergias" labelIcon="fa-solid fa-triangle-exclamation">
                                <AppTextarea value={data.alergias} onChange={(v) => updateField('alergias', v)} placeholder="Ej: Penicilina" rows={2} />
                            </AppFormField>
                            <AppFormField label="Antecedentes" labelIcon="fa-solid fa-clock-rotate-left">
                                <AppTextarea value={data.antecedentes} onChange={(v) => updateField('antecedentes', v)} rows={2} />
                            </AppFormField>
                            <div className="person-form-full">
                                <AppFormField label="Notas" labelIcon="fa-solid fa-note-sticky">
                                    <AppTextarea value={data.notas} onChange={(v) => updateField('notas', v)} rows={2} />
                                </AppFormField>
                            </div>
                        </div>
                    </>
                )}

                {/* Trabajador: acceso al sistema + sedes */}
                {data.esTrabajador && (
                    <>
                        <h3 className="person-form-section-title">
                            <i className="fa-solid fa-briefcase"></i> Acceso al sistema
                        </h3>
                        <div className="person-form-grid">
                            <AppFormField label="Usuario (email)" labelIcon="fa-solid fa-at" required error={getFieldError('username')}>
                                <AppInput
                                    value={data.username || ''}
                                    onChange={(v) => updateField('username', v)}
                                    placeholder="medico@jympodologia.com"
                                    type="email"
                                    disabled={!!persona}
                                />
                            </AppFormField>

                            {!persona && (
                                <AppFormField label="Contraseña temporal" labelIcon="fa-solid fa-key" required error={getFieldError('password')}>
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
                            <i className="fa-solid fa-hospital"></i> Sedes asignadas
                        </h3>
                        <div className="person-sedes-grid">
                            {sedes.map((sede) => (
                                <label key={sede.id} className="person-sede-check">
                                    <input
                                        type="checkbox"
                                        checked={data.sedesIds.includes(sede.id)}
                                        onChange={() => toggleSede(sede.id)}
                                    />
                                    <span>{sede.nombre}</span>
                                </label>
                            ))}
                        </div>
                        {getFieldError('sedesIds') && (
                            <div className="person-form-api-error" style={{ marginTop: '0.5rem' }}>
                                <i className="fa-solid fa-circle-exclamation"></i>
                                <span>{getFieldError('sedesIds')}</span>
                            </div>
                        )}
                    </>
                )}

                {/* Estado */}
                <div className="person-form-flags">
                    <label className="person-checkbox">
                        <input
                            type="checkbox"
                            checked={data.activo}
                            onChange={(e) => updateField('activo', e.target.checked)}
                        />
                        <span>
                            <i className="fa-solid fa-circle-check"></i> Persona activa
                        </span>
                    </label>
                </div>
            </form>
        </AppModal>
    );
};
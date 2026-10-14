import React, { useState } from 'react';
import {
    AppButton,
    AppInput,
    AppFormField,
    AppTextarea,
} from '../../../components';
import { Persona, TIPO_LABELS } from '../../people/person';
import { useCompany } from '../../company/context/CompanyContext';

interface Props {
    persona: Persona;
    onSave: (data: Partial<Persona>) => Promise<void>;
}

export const ProfileInfo: React.FC<Props> = ({ persona, onSave }) => {
    const { sedes } = useCompany();
    const [whatsapp, setWhatsapp] = useState(persona.whatsapp);
    const [email, setEmail] = useState(persona.email);
    const [direccion, setDireccion] = useState(persona.direccion);
    const [alergias, setAlergias] = useState(persona.alergias);
    const [antecedentes, setAntecedentes] = useState(persona.antecedentes);
    const [notas, setNotas] = useState(persona.notas);
    const [isSaving, setIsSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        setSuccess(false);
        try {
            const payload: Partial<Persona> = {
                whatsapp,
                email,
                direccion,
            };
            if (persona.tipo === 'paciente') {
                payload.alergias = alergias;
                payload.antecedentes = antecedentes;
                payload.notas = notas;
            }
            await onSave(payload);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } finally {
            setIsSaving(false);
        }
    };

    const sedeActual = sedes.find((s) => persona.sedesIds.includes(s.id));

    return (
        <div className="profile-info">
            {success && (
                <div className="profile-success">
                    <i className="fa-solid fa-circle-check"></i>
                    <span>Datos actualizados correctamente</span>
                </div>
            )}

            {/* Datos editables */}
            <h3 className="profile-section-title">
                <i className="fa-solid fa-pen-to-square"></i> Datos editables
            </h3>
            <div className="profile-grid">
                <AppFormField label="WhatsApp" labelIcon="fa-brands fa-whatsapp" required>
                    <AppInput value={whatsapp} onChange={setWhatsapp} placeholder="+51910123456" />
                </AppFormField>

                <AppFormField label="Email personal" labelIcon="fa-solid fa-envelope">
                    <AppInput value={email} onChange={setEmail} placeholder="correo@ejemplo.com" type="email" />
                </AppFormField>

                <div className="profile-full">
                    <AppFormField label="Dirección" labelIcon="fa-solid fa-location-dot">
                        <AppInput value={direccion} onChange={setDireccion} placeholder="Av. Ejemplo 123" />
                    </AppFormField>
                </div>
            </div>

            {persona.tipo === 'paciente' && (
                <>
                    <h3 className="profile-section-title">
                        <i className="fa-solid fa-notes-medical"></i> Información médica
                    </h3>
                    <div className="profile-grid">
                        <AppFormField label="Alergias" labelIcon="fa-solid fa-triangle-exclamation">
                            <AppTextarea value={alergias} onChange={setAlergias} rows={2} />
                        </AppFormField>
                        <AppFormField label="Antecedentes" labelIcon="fa-solid fa-clock-rotate-left">
                            <AppTextarea value={antecedentes} onChange={setAntecedentes} rows={2} />
                        </AppFormField>
                        <div className="profile-full">
                            <AppFormField label="Notas" labelIcon="fa-solid fa-note-sticky">
                                <AppTextarea value={notas} onChange={setNotas} rows={2} />
                            </AppFormField>
                        </div>
                    </div>
                </>
            )}

            {/* Datos bloqueados */}
            <h3 className="profile-section-title locked">
                <i className="fa-solid fa-lock"></i> Datos bloqueados (solo admin)
            </h3>
            <div className="profile-grid">
                <AppFormField label="Nombre completo" labelIcon="fa-solid fa-user">
                    <AppInput value={persona.nombre} onChange={() => { }} disabled />
                </AppFormField>

                <AppFormField label="DNI" labelIcon="fa-solid fa-id-card">
                    <AppInput value={persona.dni} onChange={() => { }} disabled />
                </AppFormField>

                <AppFormField label="Tipo" labelIcon="fa-solid fa-user-tag">
                    <AppInput value={TIPO_LABELS[persona.tipo]} onChange={() => { }} disabled />
                </AppFormField>

                <AppFormField label="Sede principal" labelIcon="fa-solid fa-hospital">
                    <AppInput value={sedeActual?.nombre || '—'} onChange={() => { }} disabled />
                </AppFormField>
            </div>

            <div className="profile-actions">
                <AppButton
                    variant="primary"
                    onClick={handleSave}
                    loading={isSaving}
                    icon="fa-solid fa-floppy-disk"
                    iconPosition="left"
                >
                    Guardar cambios
                </AppButton>
            </div>
        </div>
    );
};
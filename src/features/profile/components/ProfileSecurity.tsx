import React, { useState } from 'react';
import { AppButton, AppInput, AppFormField } from '../../../components';
import { useMyProfile } from '../hooks/useMyProfile';
import { validatePasswordForm, hasErrors, PasswordErrors } from '../utils/profileHelpers';

export const ProfileSecurity: React.FC = () => {
    const { changePassword } = useMyProfile();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState<PasswordErrors>({});
    const [isSaving, setIsSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [apiError, setApiError] = useState('');

    const handleSubmit = async () => {
        setApiError('');
        setSuccess(false);

        const errs = validatePasswordForm(currentPassword, newPassword, confirmPassword);
        if (hasErrors(errs as Record<string, string | undefined>)) {
            setErrors(errs);
            return;
        }
        setErrors({});
        setIsSaving(true);
        try {
            await changePassword(currentPassword, newPassword);
            setSuccess(true);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => setSuccess(false), 4000);
        } catch (e: any) {
            console.error('Error cambiando contraseña:', e);
            if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
                setApiError('La contraseña actual es incorrecta');
            } else {
                setApiError(e.message || 'Error al cambiar la contraseña');
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="profile-security">
            {apiError && (
                <div className="profile-error">
                    <i className="fa-solid fa-circle-exclamation"></i>
                    <span>{apiError}</span>
                </div>
            )}

            {success && (
                <div className="profile-success">
                    <i className="fa-solid fa-circle-check"></i>
                    <span>Contraseña actualizada correctamente</span>
                </div>
            )}

            <div className="profile-grid">
                <div className="profile-full">
                    <AppFormField
                        label="Contraseña actual"
                        labelIcon="fa-solid fa-key"
                        required
                        error={errors.currentPassword}
                    >
                        <AppInput
                            type="password"
                            value={currentPassword}
                            onChange={setCurrentPassword}
                            placeholder="••••••••"
                            showPasswordToggle
                        />
                    </AppFormField>
                </div>

                <AppFormField
                    label="Nueva contraseña"
                    labelIcon="fa-solid fa-lock"
                    required
                    error={errors.newPassword}
                >
                    <AppInput
                        type="password"
                        value={newPassword}
                        onChange={setNewPassword}
                        placeholder="Mínimo 6 caracteres"
                        showPasswordToggle
                    />
                </AppFormField>

                <AppFormField
                    label="Confirmar nueva contraseña"
                    labelIcon="fa-solid fa-lock"
                    required
                    error={errors.confirmPassword}
                >
                    <AppInput
                        type="password"
                        value={confirmPassword}
                        onChange={setConfirmPassword}
                        placeholder="Repite la contraseña"
                        showPasswordToggle
                    />
                </AppFormField>
            </div>

            <div className="profile-actions">
                <AppButton
                    variant="primary"
                    onClick={handleSubmit}
                    loading={isSaving}
                    icon="fa-solid fa-shield-halved"
                    iconPosition="left"
                >
                    Actualizar contraseña
                </AppButton>
            </div>
        </div>
    );
};
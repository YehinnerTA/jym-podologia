import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppButton, AppInput, AppFormField, AppConfirmDialog } from '../../../components';
import { auth, db } from '../../../config/firebase';
import { useMyProfile } from '../hooks/useMyProfile';
import { validateCredentialsForm, hasErrors, CredentialsErrors } from '../utils/profileHelpers';
import {
    EmailAuthProvider,
    reauthenticateWithCredential,
    createUserWithEmailAndPassword,
    getAuth,
    deleteUser,
} from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import {
    doc,
    updateDoc,
    setDoc,
    serverTimestamp,
    getDoc,
    deleteDoc,
} from 'firebase/firestore';

export const ProfileCredentials: React.FC = () => {
    const navigate = useNavigate();
    const { persona } = useMyProfile();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState<CredentialsErrors>({});
    const [isSaving, setIsSaving] = useState(false);
    const [apiError, setApiError] = useState('');
    const [confirmOpen, setConfirmOpen] = useState(false);

    const handlePreSubmit = () => {
        setApiError('');
        const errs = validateCredentialsForm(
            currentPassword,
            newEmail,
            newPassword,
            confirmPassword,
            persona?.username || ''
        );
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }
        setErrors({});
        setConfirmOpen(true);
    };

    const handleConfirm = async () => {
        setConfirmOpen(false);
        const user = auth.currentUser;
        if (!user || !user.email || !persona) {
            setApiError('Sesión no válida');
            return;
        }

        setIsSaving(true);
        try {
            // 1. Reautenticar al usuario actual
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);

            // 2. Obtener datos actuales del documento usuarios ANTES de borrar
            const userSnap = await getDoc(doc(db, 'usuarios', user.uid));
            const oldUserData = userSnap.data() || {};

            // 3. Crear nueva cuenta en Auth con app secundaria
            const secondaryApp = initializeApp(
                {
                    apiKey: 'AIzaSyAILJOzuioe6Eiu2UcNSwjOZEe9hBQoQ5U',
                    authDomain: 'jym-podogologia-sac.firebaseapp.com',
                    projectId: 'jym-podogologia-sac',
                },
                `secondary-credentials-${Date.now()}`
            );
            const secondaryAuth = getAuth(secondaryApp);
            const newCredential = await createUserWithEmailAndPassword(
                secondaryAuth,
                newEmail,
                newPassword
            );
            const newUid = newCredential.user.uid;
            await deleteApp(secondaryApp);

            // 4. Crear nuevo documento en usuarios con el nuevo uid
            await setDoc(doc(db, 'usuarios', newUid), {
                ...oldUserData,
                email: newEmail,
                activo: true,
                updatedAt: serverTimestamp(),
            });

            // 5. Actualizar la persona con el nuevo authUid y username
            await updateDoc(doc(db, 'personas', persona.id), {
                authUid: newUid,
                username: newEmail,
                updatedAt: serverTimestamp(),
            });

            // 6. Eliminar el documento antiguo de usuarios
            await deleteDoc(doc(db, 'usuarios', user.uid));

            // 7. ELIMINAR la cuenta antigua de Authentication
            await deleteUser(user);

            // 8. Redirigir al login
            navigate('/login');
        } catch (e: any) {
            console.error('Error cambiando credenciales:', e);
            if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
                setApiError('La contraseña actual es incorrecta');
            } else if (e.code === 'auth/email-already-in-use') {
                setApiError('El correo ya está en uso');
            } else if (e.code === 'auth/requires-recent-login') {
                setApiError('Debes volver a iniciar sesión antes de cambiar el correo');
            } else {
                setApiError(e.message || 'Error al cambiar credenciales');
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="profile-credentials">
            <div className="profile-warning">
                <i className="fa-solid fa-triangle-exclamation"></i>
                <div>
                    <strong>Importante:</strong> Al cambiar tu correo de acceso, se eliminará tu cuenta
                    anterior y se cerrará tu sesión automáticamente. Deberás ingresar con el nuevo correo
                    y contraseña.
                </div>
            </div>

            {apiError && (
                <div className="profile-error">
                    <i className="fa-solid fa-circle-exclamation"></i>
                    <span>{apiError}</span>
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

                <div className="profile-full">
                    <AppFormField
                        label="Nuevo correo de acceso"
                        labelIcon="fa-solid fa-at"
                        required
                        error={errors.newEmail}
                    >
                        <AppInput
                            type="email"
                            value={newEmail}
                            onChange={setNewEmail}
                            placeholder="nuevo@jympodologia.com"
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
                    label="Confirmar contraseña"
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
                    variant="danger"
                    onClick={handlePreSubmit}
                    loading={isSaving}
                    icon="fa-solid fa-right-from-bracket"
                    iconPosition="left"
                >
                    Cambiar y cerrar sesión
                </AppButton>
            </div>

            <AppConfirmDialog
                isOpen={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleConfirm}
                title="Confirmar cambio de credenciales"
                message={`¿Cambiar tu correo a "${newEmail}"? Se eliminará tu cuenta anterior y se cerrará tu sesión.`}
                confirmText="Sí, cambiar"
                variant="danger"
                loading={isSaving}
            />
        </div>
    );
};
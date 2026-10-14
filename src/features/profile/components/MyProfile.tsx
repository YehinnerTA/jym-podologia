import React, { useState } from 'react';
import { AppModal, AppLoader, AppEmptyState } from '../../../components';
import { useMyProfile } from '../hooks/useMyProfile';
import { useAuth } from '../../auth/context/AuthContext';
import { ProfileInfo } from './ProfileInfo';
import { ProfileSecurity } from './ProfileSecurity';
import { ProfileCredentials } from './ProfileCredentials';
import { canManageCredentials } from '../utils/profileHelpers';
import { TIPO_LABELS } from '../../people/person';
import '../profile.css';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

type Tab = 'info' | 'security' | 'credentials';

export const MyProfile: React.FC<Props> = ({ isOpen, onClose }) => {
    const { persona, isLoading, error, updatePersonalData } = useMyProfile();
    const { user } = useAuth();
    const [tab, setTab] = useState<Tab>('info');

    if (isLoading) {
        return (
            <AppModal isOpen={isOpen} onClose={onClose} title="Mi Perfil" icon="fa-solid fa-user" size="lg">
                <AppLoader message="Cargando perfil..." />
            </AppModal>
        );
    }

    if (error || !persona) {
        return (
            <AppModal isOpen={isOpen} onClose={onClose} title="Mi Perfil" icon="fa-solid fa-user" size="lg">
                <AppEmptyState
                    icon="fa-solid fa-user-slash"
                    title="Perfil no disponible"
                    message={error || 'No se pudo cargar tu perfil'}
                />
            </AppModal>
        );
    }

    const showCredentials = canManageCredentials(persona);
    const inicial = persona.nombre.charAt(0).toUpperCase();

    return (
        <AppModal
            isOpen={isOpen}
            onClose={onClose}
            title="Mi Perfil"
            icon="fa-solid fa-user"
            size="lg"
        >
            <div className="profile-header">
                <div className="profile-avatar">{inicial}</div>
                <div className="profile-header-info">
                    <h2>{persona.nombre}</h2>
                    <p className="profile-role">{TIPO_LABELS[persona.tipo]}</p>
                    <p className="profile-email">{user?.email || persona.email}</p>
                </div>
            </div>

            <div className="profile-tabs">
                <button
                    type="button"
                    className={`profile-tab ${tab === 'info' ? 'active' : ''}`}
                    onClick={() => setTab('info')}
                >
                    <i className="fa-solid fa-user"></i> Datos
                </button>
                <button
                    type="button"
                    className={`profile-tab ${tab === 'security' ? 'active' : ''}`}
                    onClick={() => setTab('security')}
                >
                    <i className="fa-solid fa-lock"></i> Contraseña
                </button>
                {showCredentials && (
                    <button
                        type="button"
                        className={`profile-tab ${tab === 'credentials' ? 'active' : ''}`}
                        onClick={() => setTab('credentials')}
                    >
                        <i className="fa-solid fa-key"></i> Credenciales
                    </button>
                )}
            </div>

            <div className="profile-content">
                {tab === 'info' && (
                    <ProfileInfo persona={persona} onSave={updatePersonalData} />
                )}
                {tab === 'security' && <ProfileSecurity />}
                {tab === 'credentials' && showCredentials && <ProfileCredentials />}
            </div>
        </AppModal>
    );
};
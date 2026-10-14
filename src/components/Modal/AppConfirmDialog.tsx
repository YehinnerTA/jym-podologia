import React from 'react';
import { AppModal } from './AppModal';
import { AppButton } from '../Button/AppButton';

export interface AppConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'primary' | 'warning';
    loading?: boolean;
}

export const AppConfirmDialog: React.FC<AppConfirmDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    variant = 'danger',
    loading = false,
}) => {
    const iconMap = {
        danger: 'fa-solid fa-triangle-exclamation',
        primary: 'fa-solid fa-circle-question',
        warning: 'fa-solid fa-triangle-exclamation',
    };

    return (
        <AppModal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            icon={iconMap[variant]}
            size="sm"
            footer={
                <>
                    <AppButton variant="ghost" onClick={onClose} disabled={loading}>
                        {cancelText}
                    </AppButton>
                    <AppButton
                        variant={variant === 'primary' ? 'primary' : 'danger'}
                        onClick={onConfirm}
                        loading={loading}
                    >
                        {confirmText}
                    </AppButton>
                </>
            }
        >
            <div className="app-confirm-body">
                <p>{message}</p>
            </div>
        </AppModal>
    );
};
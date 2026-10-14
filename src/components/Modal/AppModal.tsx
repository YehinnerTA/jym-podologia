import React, { useEffect } from 'react';
import '../../theme/global.css';

export interface AppModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    icon?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg';
}

export const AppModal: React.FC<AppModalProps> = ({
    isOpen,
    onClose,
    title,
    icon,
    children,
    footer,
    size = 'md',
}) => {
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        document.addEventListener('keydown', handleEscape);

        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="app-modal-overlay" onClick={onClose}>
            <div
                className={`app-modal app-modal-${size}`}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                <div className="app-modal-header">
                    <div className="app-modal-title">
                        {icon && <i className={icon}></i>}
                        <h3>{title}</h3>
                    </div>
                    <button
                        type="button"
                        className="app-modal-close"
                        onClick={onClose}
                        aria-label="Cerrar"
                    >
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div className="app-modal-body">{children}</div>

                {footer && <div className="app-modal-footer">{footer}</div>}
            </div>
        </div>
    );
};
import React from 'react';
import '../../theme/global.css';

export interface AppButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    type?: 'button' | 'submit' | 'reset';
    variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    icon?: string;
    iconPosition?: 'left' | 'right';
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
    className?: string;
}

export const AppButton: React.FC<AppButtonProps> = ({
    children,
    onClick,
    type = 'button',
    variant = 'primary',
    size = 'md',
    icon,
    iconPosition = 'right',
    disabled = false,
    loading = false,
    fullWidth = false,
    className = ''
}) => {
    const classes = [
        'app-btn',
        `app-btn-${variant}`,
        `app-btn-${size}`,
        fullWidth ? 'app-btn-full' : '',
        loading ? 'app-btn-loading' : '',
        className
    ].filter(Boolean).join(' ');

    const finalIcon = loading ? 'fa-solid fa-spinner fa-spin' : icon;

    return (
        <button
            type={type}
            className={classes}
            onClick={onClick}
            disabled={disabled || loading}
        >
            {finalIcon && iconPosition === 'left' && (
                <i className={finalIcon}></i>
            )}
            <span>{children}</span>
            {finalIcon && iconPosition === 'right' && (
                <i className={finalIcon}></i>
            )}
        </button>
    );
};
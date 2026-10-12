import React from 'react';
import '../../theme/global.css';

interface AppBadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'primary' | 'success' | 'danger' | 'warning';
    icon?: string;
}

export const AppBadge: React.FC<AppBadgeProps> = ({
    children,
    variant = 'default',
    icon
}) => {
    return (
        <span className={`app-badge app-badge-${variant}`}>
            {icon && <i className={icon}></i>}
            {children}
        </span>
    );
};
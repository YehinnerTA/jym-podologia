import React from 'react';
import '../../theme/global.css';

interface AppEmptyStateProps {
    icon?: string;
    title: string;
    message?: string;
    action?: React.ReactNode;
}

export const AppEmptyState: React.FC<AppEmptyStateProps> = ({
    icon = 'fa-solid fa-inbox',
    title,
    message,
    action
}) => {
    return (
        <div className="app-empty">
            <i className={icon}></i>
            <h3>{title}</h3>
            {message && <p>{message}</p>}
            {action && <div className="app-empty-action">{action}</div>}
        </div>
    );
};
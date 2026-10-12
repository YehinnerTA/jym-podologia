import React from 'react';
import '../../theme/global.css';

interface AppCardProps {
    children: React.ReactNode;
    className?: string;
    padding?: 'sm' | 'md' | 'lg';
}

export const AppCard: React.FC<AppCardProps> = ({
    children,
    className = '',
    padding = 'md'
}) => {
    return (
        <div className={`app-card app-card-${padding} ${className}`}>
            {children}
        </div>
    );
};
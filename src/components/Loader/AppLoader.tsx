import React from 'react';
import '../../theme/global.css';

interface AppLoaderProps {
    message?: string;
    fullScreen?: boolean;
}

export const AppLoader: React.FC<AppLoaderProps> = ({
    message = 'Cargando...',
    fullScreen = false
}) => {
    return (
        <div className={`app-loader ${fullScreen ? 'app-loader-full' : ''}`}>
            <i className="fa-solid fa-spinner fa-spin"></i>
            {message && <p>{message}</p>}
        </div>
    );
};
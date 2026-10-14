import React from 'react';
import '../../theme/global.css';

export interface AppSearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    onClear?: () => void;
}

export const AppSearchInput: React.FC<AppSearchInputProps> = ({
    value,
    onChange,
    placeholder = 'Buscar...',
    onClear,
}) => {
    const handleClear = () => {
        onChange('');
        onClear?.();
    };

    return (
        <div className="app-search">
            <i className="fa-solid fa-magnifying-glass app-search-icon"></i>
            <input
                type="text"
                className="app-search-input"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
            />
            {value && (
                <button
                    type="button"
                    className="app-search-clear"
                    onClick={handleClear}
                    aria-label="Limpiar búsqueda"
                >
                    <i className="fa-solid fa-xmark"></i>
                </button>
            )}
        </div>
    );
};
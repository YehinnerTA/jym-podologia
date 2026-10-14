import React from 'react';
import '../../theme/global.css';

export interface AppSelectOption {
    value: string;
    label: string;
}

export interface AppSelectProps {
    label?: string;
    labelIcon?: string;
    id?: string;
    value: string;
    onChange: (value: string) => void;
    options: AppSelectOption[];
    placeholder?: string;
    status?: 'default' | 'success' | 'error';
    errorMessage?: string;
    disabled?: boolean;
    required?: boolean;
    icon?: string;
}

export const AppSelect: React.FC<AppSelectProps> = ({
    label,
    labelIcon,
    id,
    value,
    onChange,
    options,
    placeholder = 'Selecciona una opción',
    status = 'default',
    errorMessage,
    disabled,
    required,
    icon,
}) => {
    const wrapperClass = [
        'app-select-wrapper',
        status === 'error' ? 'app-select-error' : '',
        status === 'success' ? 'app-select-success' : '',
    ].filter(Boolean).join(' ');

    return (
        <div className="app-select-group">
            {label && (
                <label className="app-select-label" htmlFor={id}>
                    {labelIcon && <i className={`${labelIcon} app-select-label-icon`}></i>}
                    {label}
                </label>
            )}
            <div className={wrapperClass}>
                {icon && (
                    <span className="app-select-icon">
                        <i className={icon}></i>
                    </span>
                )}
                <select
                    id={id}
                    className="app-select"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    required={required}
                >
                    <option value="" disabled>
                        {placeholder}
                    </option>
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                <i className="fa-solid fa-chevron-down app-select-chevron"></i>
            </div>
            {errorMessage && status === 'error' && (
                <div className="app-select-message">{errorMessage}</div>
            )}
        </div>
    );
};
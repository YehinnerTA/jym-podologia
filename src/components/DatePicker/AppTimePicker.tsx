import React from 'react';

export interface AppTimePickerProps {
    label?: string;
    labelIcon?: string;
    id?: string;
    value: string; // HH:mm
    onChange: (value: string) => void;
    min?: string;
    max?: string;
    step?: number;
    status?: 'default' | 'success' | 'error';
    errorMessage?: string;
    disabled?: boolean;
    required?: boolean;
}

export const AppTimePicker: React.FC<AppTimePickerProps> = ({
    label,
    labelIcon,
    id,
    value,
    onChange,
    min,
    max,
    step = 900, // 15 min
    status = 'default',
    errorMessage,
    disabled,
    required,
}) => {
    const wrapperClass = [
        'app-time-wrapper',
        status === 'error' ? 'app-time-error' : '',
        status === 'success' ? 'app-time-success' : '',
    ].filter(Boolean).join(' ');

    return (
        <div className="app-time-group">
            {label && (
                <label className="app-time-label" htmlFor={id}>
                    {labelIcon && <i className={`${labelIcon} app-time-label-icon`}></i>}
                    {label}
                </label>
            )}
            <div className={wrapperClass}>
                <i className="fa-solid fa-clock app-time-icon"></i>
                <input
                    type="time"
                    id={id}
                    className="app-time"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    min={min}
                    max={max}
                    step={step}
                    disabled={disabled}
                    required={required}
                />
            </div>
            {errorMessage && status === 'error' && (
                <div className="app-time-message">{errorMessage}</div>
            )}
        </div>
    );
};
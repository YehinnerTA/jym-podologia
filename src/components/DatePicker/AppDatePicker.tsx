import React from 'react';

export interface AppDatePickerProps {
    label?: string;
    labelIcon?: string;
    id?: string;
    value: string; // YYYY-MM-DD
    onChange: (value: string) => void;
    min?: string;
    max?: string;
    status?: 'default' | 'success' | 'error';
    errorMessage?: string;
    disabled?: boolean;
    required?: boolean;
}

export const AppDatePicker: React.FC<AppDatePickerProps> = ({
    label,
    labelIcon,
    id,
    value,
    onChange,
    min,
    max,
    status = 'default',
    errorMessage,
    disabled,
    required,
}) => {
    const wrapperClass = [
        'app-date-wrapper',
        status === 'error' ? 'app-date-error' : '',
        status === 'success' ? 'app-date-success' : '',
    ].filter(Boolean).join(' ');

    return (
        <div className="app-date-group">
            {label && (
                <label className="app-date-label" htmlFor={id}>
                    {labelIcon && <i className={`${labelIcon} app-date-label-icon`}></i>}
                    {label}
                </label>
            )}
            <div className={wrapperClass}>
                <i className="fa-solid fa-calendar app-date-icon"></i>
                <input
                    type="date"
                    id={id}
                    className="app-date"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    min={min}
                    max={max}
                    disabled={disabled}
                    required={required}
                />
            </div>
            {errorMessage && status === 'error' && (
                <div className="app-date-message">{errorMessage}</div>
            )}
        </div>
    );
};
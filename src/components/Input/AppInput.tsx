import React, { forwardRef } from 'react';
import '../../theme/global.css';

export interface AppInputProps {
    label?: string;
    labelIcon?: string;
    type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'date';
    id?: string;
    name?: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    icon?: string;
    status?: 'default' | 'success' | 'error' | 'warning';
    errorMessage?: string;
    autoComplete?: string;
    required?: boolean;
    minLength?: number;
    disabled?: boolean;
    showPasswordToggle?: boolean;
    rightSlot?: React.ReactNode;
}

export const AppInput = forwardRef<HTMLInputElement, AppInputProps>(({
    label,
    labelIcon,
    type = 'text',
    id,
    name,
    value,
    onChange,
    placeholder,
    icon,
    status = 'default',
    errorMessage,
    autoComplete,
    required,
    minLength,
    disabled,
    showPasswordToggle = false,
    rightSlot
}, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const inputType = showPasswordToggle
        ? (showPassword ? 'text' : 'password')
        : type;

    const wrapperClass = [
        'app-input-wrapper',
        status === 'error' ? 'app-input-error' : '',
        status === 'success' ? 'app-input-success' : '',
        status === 'warning' ? 'app-input-warning' : ''
    ].filter(Boolean).join(' ');

    return (
        <div className="app-input-group">
            {label && (
                <label className="app-input-label" htmlFor={id}>
                    {labelIcon && <i className={`${labelIcon} app-input-label-icon`}></i>}
                    {label}
                </label>
            )}
            <div className={wrapperClass}>
                {icon && (
                    <span className="app-input-icon">
                        <i className={icon}></i>
                    </span>
                )}
                <input
                    ref={ref}
                    type={inputType}
                    id={id}
                    name={name}
                    className="app-input"
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    autoComplete={autoComplete}
                    required={required}
                    minLength={minLength}
                    disabled={disabled}
                />
                {rightSlot}
                {showPasswordToggle && (
                    <button
                        type="button"
                        className="app-input-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                    >
                        <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                )}
                {status === 'success' && (
                    <span className="app-input-validation success">
                        <i className="fa-solid fa-circle-check"></i>
                    </span>
                )}
                {status === 'error' && (
                    <span className="app-input-validation error">
                        <i className="fa-solid fa-circle-xmark"></i>
                    </span>
                )}
                {status === 'warning' && (
                    <span className="app-input-validation warning">
                        <i className="fa-solid fa-triangle-exclamation"></i>
                    </span>
                )}
            </div>
            {errorMessage && status === 'error' && (
                <div className="app-input-message">{errorMessage}</div>
            )}
        </div>
    );
});

AppInput.displayName = 'AppInput';
import React from 'react';
import '../../theme/global.css';

export interface AppTextareaProps {
    label?: string;
    labelIcon?: string;
    id?: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    rows?: number;
    status?: 'default' | 'success' | 'error';
    errorMessage?: string;
    disabled?: boolean;
    required?: boolean;
    maxLength?: number;
}

export const AppTextarea: React.FC<AppTextareaProps> = ({
    label,
    labelIcon,
    id,
    value,
    onChange,
    placeholder,
    rows = 4,
    status = 'default',
    errorMessage,
    disabled,
    required,
    maxLength,
}) => {
    const wrapperClass = [
        'app-textarea-wrapper',
        status === 'error' ? 'app-textarea-error' : '',
        status === 'success' ? 'app-textarea-success' : '',
    ].filter(Boolean).join(' ');

    return (
        <div className="app-textarea-group">
            {label && (
                <label className="app-textarea-label" htmlFor={id}>
                    {labelIcon && <i className={`${labelIcon} app-textarea-label-icon`}></i>}
                    {label}
                </label>
            )}
            <div className={wrapperClass}>
                <textarea
                    id={id}
                    className="app-textarea"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    rows={rows}
                    disabled={disabled}
                    required={required}
                    maxLength={maxLength}
                />
                {maxLength && (
                    <span className="app-textarea-counter">
                        {value.length}/{maxLength}
                    </span>
                )}
            </div>
            {errorMessage && status === 'error' && (
                <div className="app-textarea-message">{errorMessage}</div>
            )}
        </div>
    );
};
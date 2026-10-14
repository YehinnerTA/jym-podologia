import React from 'react';

export interface AppFormFieldProps {
    label?: string;
    labelIcon?: string;
    htmlFor?: string;
    required?: boolean;
    error?: string;
    hint?: string;
    children: React.ReactNode;
    className?: string;
}

export const AppFormField: React.FC<AppFormFieldProps> = ({
    label,
    labelIcon,
    htmlFor,
    required,
    error,
    hint,
    children,
    className = '',
}) => {
    return (
        <div className={`app-field ${className}`}>
            {label && (
                <label className="app-field-label" htmlFor={htmlFor}>
                    {labelIcon && <i className={`${labelIcon} app-field-label-icon`}></i>}
                    {label}
                    {required && <span className="app-field-required">*</span>}
                </label>
            )}
            {children}
            {hint && !error && <div className="app-field-hint">{hint}</div>}
            {error && <div className="app-field-error">{error}</div>}
        </div>
    );
};
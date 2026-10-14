import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '../context/CompanyContext';
import { SedeSelectorMenuProps } from '../sede';
import { AppButton, AppCard, AppLoader, AppBadge, AppEmptyState } from '../../../components';
import '../SelectSede.css';

export const SelectSede: React.FC<SedeSelectorMenuProps> = ({
    onSelect,
    redirectTo = '/sedes',
}) => {
    const navigate = useNavigate();
    const { selectedSede, setSelectedSede, sedes, isLoading } = useCompany();

    if (isLoading) {
        return (
            <div className="ruc-selector-page">
                <AppCard padding="md">
                    <AppLoader message="Cargando sedes..." />
                </AppCard>
            </div>
        );
    }

    if (sedes.length === 0) {
        return (
            <div className="ruc-selector-page">
                <AppCard padding="md">
                    <AppEmptyState
                        icon="fa-solid fa-exclamation-triangle"
                        title="Sin sedes"
                        message="No hay sedes registradas. Contacta al administrador."
                    />
                </AppCard>
            </div>
        );
    }

    return (
        <div className="ruc-selector-page">
            <div className="ruc-selector-card">
                <div className="ruc-selector-header">
                    <img src="/logo-jym.png" alt="J&M Podología" className="ruc-selector-logo" />
                    <h2 className="ruc-selector-title">Selecciona tu sede</h2>
                </div>

                <div className="ruc-selector-grid">
                    {sedes.map((sede) => (
                        <div
                            key={sede.id}
                            className={`ruc-selector-option ${selectedSede === sede.id ? 'active' : ''}`}
                            onClick={() => { setSelectedSede(sede.id); onSelect?.(sede.id); }}
                        >
                            <div className="ruc-selector-option-icon">
                                <i className="fas fa-hospital"></i>
                            </div>
                            <div className="ruc-selector-option-code">{sede.ruc}</div>
                            <div className="ruc-selector-option-label">{sede.nombre}</div>
                            {sede.esPredeterminada && (
                                <AppBadge variant="success" icon="fas fa-star">Predeterminada</AppBadge>
                            )}
                            {selectedSede === sede.id && (
                                <AppBadge variant="primary" icon="fas fa-check-circle">Seleccionada</AppBadge>
                            )}
                        </div>
                    ))}
                </div>

                <div className="ruc-selector-actions">
                    <AppButton
                        variant="primary"
                        size="lg"
                        icon="fas fa-arrow-right"
                        disabled={!selectedSede}
                        onClick={() => selectedSede && navigate(redirectTo)}
                    >
                        Continuar
                    </AppButton>
                </div>
            </div>
        </div>
    );
};
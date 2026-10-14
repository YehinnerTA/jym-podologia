import React from 'react';
import { Sede } from '../../company/sede';

interface Props {
    sedes: Sede[];
    selectedSede: string | null;
    multiplesSedes: boolean;
    onChange: (sedeId: string) => void;
}

export const HeaderSedeSelector: React.FC<Props> = ({
    sedes,
    selectedSede,
    multiplesSedes,
    onChange,
}) => {
    const sedeActual = sedes.find(s => s.id === selectedSede);

    // Si solo hay 1 sede → texto fijo
    if (!multiplesSedes) {
        return (
            <div className="jym-sede-fixed">
                <i className="fa-solid fa-hospital"></i>
                <span>{sedeActual?.nombre || 'Sin sede'}</span>
            </div>
        );
    }

    // Si hay múltiples → combobox
    return (
        <div className="jym-sede-selector">
            <i className="fa-solid fa-hospital"></i>
            <select
                value={selectedSede || ''}
                onChange={(e) => onChange(e.target.value)}
                aria-label="Seleccionar sede"
            >
                {sedes.map(sede => (
                    <option key={sede.id} value={sede.id}>
                        {sede.nombre}
                    </option>
                ))}
            </select>
            <i className="fa-solid fa-chevron-down jym-sede-chevron"></i>
        </div>
    );
};
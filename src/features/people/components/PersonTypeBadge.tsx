import React from 'react';
import { PersonaTipo, TIPO_LABELS } from '../person';
import { TIPO_COLORS, TIPO_ICONS } from '../utils/personHelpers';

interface Props {
    tipo: PersonaTipo;
}

export const PersonTypeBadge: React.FC<Props> = ({ tipo }) => {
    return (
        <span
            className="person-type-badge"
            style={{
                backgroundColor: `${TIPO_COLORS[tipo]}15`,
                color: TIPO_COLORS[tipo],
                borderColor: `${TIPO_COLORS[tipo]}40`,
            }}
        >
            <i className={TIPO_ICONS[tipo]}></i>
            {TIPO_LABELS[tipo]}
        </span>
    );
};
import React, { useState } from 'react';
import {
    AppButton,
    AppCard,
    AppSearchInput,
    AppSelect,
    AppPagination,
    AppEmptyState,
    AppConfirmDialog,
    AppLoader,
} from '../../../components';
import { usePeople, TipoFilter, EstadoFilter } from '../hooks/usePeople';
import { Persona } from '../person';
import { personService } from '../services/personService';
import { PersonCard } from './PersonCard';
import { PersonForm } from './PersonForm';
import { PersonDetail } from './PersonDetail';
import '../people.css';

export const PersonList: React.FC = () => {
    const {
        personas,
        totalPersonas,
        isLoading,
        search,
        setSearch,
        tipoFilter,
        setTipoFilter,
        estadoFilter,
        setEstadoFilter,
        currentPage,
        totalPages,
        itemsPerPage,
        setCurrentPage,
        refresh,
    } = usePeople();

    const [formOpen, setFormOpen] = useState(false);
    const [editingPerson, setEditingPerson] = useState<Persona | null>(null);
    const [detailPerson, setDetailPerson] = useState<Persona | null>(null);
    const [toggleTarget, setToggleTarget] = useState<Persona | null>(null);
    const [toggling, setToggling] = useState(false);

    const handleNew = () => {
        setEditingPerson(null);
        setFormOpen(true);
    };

    const handleEdit = (p: Persona) => {
        setEditingPerson(p);
        setFormOpen(true);
    };

    const handleToggle = async () => {
        if (!toggleTarget) return;
        setToggling(true);
        try {
            await personService.setActivo(toggleTarget.id, !toggleTarget.activo);
            setToggleTarget(null);
            refresh();
        } catch (error) {
            console.error('Error cambiando estado:', error);
        } finally {
            setToggling(false);
        }
    };

    return (
        <div className="person-page">
            <div className="person-header">
                <div>
                    <h1 className="person-title">Personas</h1>
                    <p className="person-subtitle">Gestiona pacientes, médicos y personal</p>
                </div>
                <AppButton
                    variant="primary"
                    icon="fa-solid fa-plus"
                    iconPosition="left"
                    onClick={handleNew}
                >
                    Nueva Persona
                </AppButton>
            </div>

            <AppCard padding="md" className="person-filters-card">
                <div className="person-filters">
                    <div className="person-filters-search">
                        <AppSearchInput
                            value={search}
                            onChange={setSearch}
                            placeholder="Buscar por nombre, DNI o WhatsApp..."
                        />
                    </div>
                    <AppSelect
                        value={tipoFilter}
                        onChange={(v) => setTipoFilter(v as TipoFilter)}
                        options={[
                            { value: 'todas', label: 'Todos los tipos' },
                            { value: 'paciente', label: 'Pacientes' },
                            { value: 'medico', label: 'Médicos' },
                            { value: 'recepcionista', label: 'Recepcionistas' },
                            { value: 'admin', label: 'Administradores' },
                        ]}
                        placeholder="Tipo"
                    />
                    <AppSelect
                        value={estadoFilter}
                        onChange={(v) => setEstadoFilter(v as EstadoFilter)}
                        options={[
                            { value: 'activos', label: 'Activos' },
                            { value: 'inactivos', label: 'Inactivos' },
                            { value: 'todos', label: 'Todos' },
                        ]}
                        placeholder="Estado"
                    />
                </div>
            </AppCard>

            {isLoading ? (
                <AppCard padding="md">
                    <AppLoader message="Cargando personas..." />
                </AppCard>
            ) : personas.length === 0 ? (
                <AppCard padding="lg">
                    <AppEmptyState
                        icon="fa-solid fa-users"
                        title="Sin resultados"
                        message={
                            search || tipoFilter !== 'todas' || estadoFilter !== 'activos'
                                ? 'Prueba ajustando los filtros de búsqueda.'
                                : 'Crea la primera persona para empezar.'
                        }
                        action={
                            !search && tipoFilter === 'todas' ? (
                                <AppButton variant="primary" icon="fa-solid fa-plus" iconPosition="left" onClick={handleNew}>
                                    Crear primera persona
                                </AppButton>
                            ) : undefined
                        }
                    />
                </AppCard>
            ) : (
                <>
                    <div className="person-grid">
                        {personas.map((p) => (
                            <PersonCard
                                key={p.id}
                                persona={p}
                                onView={setDetailPerson}
                                onEdit={handleEdit}
                                onToggleActivo={setToggleTarget}
                            />
                        ))}
                    </div>
                    <AppPagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalPersonas}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                    />
                </>
            )}

            <PersonForm
                key={editingPerson?.id || 'new'}
                isOpen={formOpen}
                onClose={() => {
                    setFormOpen(false);
                    setEditingPerson(null);
                }}
                persona={editingPerson}
                onSuccess={() => {
                    setFormOpen(false);
                    setEditingPerson(null);
                    refresh();
                }}
            />

            <PersonDetail
                isOpen={!!detailPerson}
                onClose={() => setDetailPerson(null)}
                persona={detailPerson}
                onEdit={(p) => {
                    setDetailPerson(null);
                    handleEdit(p);
                }}
            />

            <AppConfirmDialog
                isOpen={!!toggleTarget}
                onClose={() => setToggleTarget(null)}
                onConfirm={handleToggle}
                title={toggleTarget?.activo ? 'Desactivar persona' : 'Activar persona'}
                message={
                    toggleTarget?.activo
                        ? `¿Desactivar a "${toggleTarget?.nombre}"? No podrá iniciar sesión pero su historial se conserva.`
                        : `¿Reactivar a "${toggleTarget?.nombre}"?`
                }
                confirmText={toggleTarget?.activo ? 'Desactivar' : 'Reactivar'}
                variant={toggleTarget?.activo ? 'danger' : 'primary'}
                loading={toggling}
            />
        </div>
    );
};
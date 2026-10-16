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

import {
    usePeople,
    TipoFilter,
    EstadoFilter,
} from '../hooks/usePeople';

import { useAuth } from '../../auth/context/AuthContext';

import { Persona } from '../person';
import { personService } from '../services/personService';

import { PersonCard } from './PersonCard';
import { PersonForm } from './PersonForm';
import { PersonDetail } from './PersonDetail';

import '../people.css';

export const PersonList: React.FC = () => {
    const { role } = useAuth();

    const isAdmin = role === 'admin';
    const isStaff = role === 'staff';

    const {
        personas,
        totalPersonas,
        isLoading,
        error,

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
    } = usePeople();

    const [formOpen, setFormOpen] =
        useState(false);

    const [editingPerson, setEditingPerson] =
        useState<Persona | null>(null);

    const [detailPerson, setDetailPerson] =
        useState<Persona | null>(null);

    const [toggleTarget, setToggleTarget] =
        useState<Persona | null>(null);

    const [toggling, setToggling] =
        useState(false);

    const [actionError, setActionError] =
        useState('');

    // El administrador gestiona todas las personas.
    // Staff solo puede trabajar con pacientes.
    const canManagePerson = (
        persona: Persona
    ): boolean => {
        if (isAdmin) {
            return true;
        }

        return (
            isStaff &&
            persona.tipo === 'paciente' &&
            persona.esTrabajador !== true
        );
    };

    const handleNew = () => {
        if (!isAdmin && !isStaff) {
            return;
        }

        setActionError('');
        setEditingPerson(null);
        setFormOpen(true);
    };

    const handleView = (persona: Persona) => {
        if (!canManagePerson(persona)) {
            setActionError(
                'No tienes permisos para visualizar este registro.'
            );
            return;
        }

        setActionError('');
        setDetailPerson(persona);
    };

    const handleEdit = (persona: Persona) => {
        if (!canManagePerson(persona)) {
            setActionError(
                'No tienes permisos para editar este registro.'
            );
            return;
        }

        setActionError('');
        setEditingPerson(persona);
        setFormOpen(true);
    };

    const handleToggleRequest = (
        persona: Persona
    ) => {
        if (!canManagePerson(persona)) {
            setActionError(
                'No tienes permisos para cambiar el estado de este registro.'
            );
            return;
        }

        setActionError('');
        setToggleTarget(persona);
    };

    const handleToggle = async () => {
        if (!toggleTarget || toggling) return;

        if (!canManagePerson(toggleTarget)) {
            setActionError(
                'No tienes permisos para modificar esta persona.'
            );
            setToggleTarget(null);
            return;
        }

        setToggling(true);
        setActionError('');

        try {
            await personService.setActivo(
                toggleTarget.id,
                !toggleTarget.activo
            );

            setToggleTarget(null);

            // usePeople recibe el cambio
            // automáticamente desde Firestore.
        } catch (error) {
            console.error(
                'Error cambiando estado:',
                error
            );

            setActionError(
                error instanceof Error
                    ? error.message
                    : 'No se pudo cambiar el estado de la persona.'
            );

            setToggleTarget(null);
        } finally {
            setToggling(false);
        }
    };

    const handleFormSuccess = () => {
        setFormOpen(false);
        setEditingPerson(null);

        // No es necesario ejecutar refresh().
    };

    return (
        <div className="person-page">

            <div className="person-header">
                <div>
                    <h1 className="person-title">
                        {isAdmin
                            ? 'Personas'
                            : 'Pacientes'}
                    </h1>

                    <p className="person-subtitle">
                        {isAdmin
                            ? 'Gestiona pacientes, médicos y personal'
                            : 'Consulta y gestiona los pacientes registrados'}
                    </p>
                </div>

                {(isAdmin || isStaff) && (
                    <AppButton
                        variant="primary"
                        icon="fa-solid fa-plus"
                        iconPosition="left"
                        onClick={handleNew}
                    >
                        {isAdmin
                            ? 'Nueva Persona'
                            : 'Nuevo Paciente'}
                    </AppButton>
                )}
            </div>

            {(error || actionError) && (
                <div
                    className="login-alert login-alert-error"
                    role="alert"
                >
                    <i className="fa-solid fa-circle-exclamation"></i>
                    <span>
                        {actionError || error}
                    </span>
                </div>
            )}

            <AppCard
                padding="md"
                className="person-filters-card"
            >
                <div className="person-filters">
                    <div className="person-filters-search">
                        <AppSearchInput
                            value={search}
                            onChange={setSearch}
                            placeholder="Buscar por nombre, DNI o WhatsApp..."
                        />
                    </div>

                    {/* Solo el administrador puede
                        filtrar por trabajadores. */}

                    {/* Administrador: todos los tipos.
    Staff: pacientes o médicos de su sede. */}
                    {(isAdmin || isStaff) && (
                        <AppSelect
                            value={tipoFilter}
                            onChange={(value) =>
                                setTipoFilter(value as TipoFilter)
                            }
                            options={
                                isAdmin
                                    ? [
                                        {
                                            value: 'todas',
                                            label: 'Todos los tipos',
                                        },
                                        {
                                            value: 'paciente',
                                            label: 'Pacientes',
                                        },
                                        {
                                            value: 'medico',
                                            label: 'Médicos',
                                        },
                                        {
                                            value: 'recepcionista',
                                            label: 'Recepcionistas',
                                        },
                                        {
                                            value: 'admin',
                                            label: 'Administradores',
                                        },
                                    ]
                                    : [
                                        {
                                            value: 'paciente',
                                            label: 'Pacientes',
                                        },
                                        {
                                            value: 'medico',
                                            label: 'Médicos de mi sede',
                                        },
                                    ]
                            }
                            placeholder="Tipo"
                        />
                    )}

                    <AppSelect
                        value={estadoFilter}
                        onChange={(value) =>
                            setEstadoFilter(
                                value as EstadoFilter
                            )
                        }
                        options={[
                            {
                                value: 'activos',
                                label: 'Activos',
                            },
                            {
                                value: 'inactivos',
                                label: 'Inactivos',
                            },
                            {
                                value: 'todos',
                                label: 'Todos',
                            },
                        ]}
                        placeholder="Estado"
                    />
                </div>
            </AppCard>

            {isLoading ? (
                <AppCard padding="md">
                    <AppLoader
                        message={
                            isAdmin
                                ? 'Cargando personas...'
                                : 'Cargando pacientes...'
                        }
                    />
                </AppCard>
            ) : error ? (
                <AppCard padding="lg">
                    <AppEmptyState
                        icon="fa-solid fa-circle-exclamation"
                        title="No se pudieron cargar los registros"
                        message="Verifica la conexión y los permisos de Firebase."
                    />
                </AppCard>
            ) : personas.length === 0 ? (
                <AppCard padding="lg">
                    <AppEmptyState
                        icon="fa-solid fa-users"
                        title="Sin resultados"
                        message={
                            search ||
                                (isAdmin &&
                                    tipoFilter !== 'todas') ||
                                estadoFilter !== 'activos'
                                ? 'Prueba ajustando los filtros de búsqueda.'
                                : isAdmin
                                    ? 'Crea la primera persona para empezar.'
                                    : 'Registra el primer paciente para empezar.'
                        }
                        action={
                            !search &&
                                (isAdmin || isStaff) ? (
                                <AppButton
                                    variant="primary"
                                    icon="fa-solid fa-plus"
                                    iconPosition="left"
                                    onClick={handleNew}
                                >
                                    {isAdmin
                                        ? 'Crear primera persona'
                                        : 'Registrar paciente'}
                                </AppButton>
                            ) : undefined
                        }
                    />
                </AppCard>
            ) : (
                <>

                    <div className="person-grid">
                        {personas.map((persona) =>
                            isStaff && persona.tipo === 'medico' ? (
                                <div
                                    className="person-card"
                                    key={persona.id}
                                >
                                    <div className="person-card-header">
                                        <div className="person-card-avatar">
                                            {(persona.nombre || '')
                                                .charAt(0)
                                                .toUpperCase()}
                                        </div>

                                        <div className="person-card-info">
                                            <h3 className="person-card-name">
                                                {persona.nombre}
                                            </h3>

                                            <p className="person-card-dni">
                                                {persona.especialidad ||
                                                    'Profesional de podología'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="person-card-body">
                                        <div className="person-card-badges">
                                            <span className="person-badge activa">
                                                Activo
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <PersonCard
                                    key={persona.id}
                                    persona={persona}
                                    onView={handleView}
                                    onEdit={handleEdit}
                                    onToggleActivo={
                                        handleToggleRequest
                                    }
                                />
                            )
                        )}
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

            {(isAdmin || isStaff) && (
                <PersonForm
                    key={
                        editingPerson?.id || 'new'
                    }
                    isOpen={formOpen}
                    onClose={() => {
                        setFormOpen(false);
                        setEditingPerson(null);
                    }}
                    persona={editingPerson}
                    onSuccess={handleFormSuccess}
                />
            )}

            <PersonDetail
                isOpen={!!detailPerson}
                onClose={() =>
                    setDetailPerson(null)
                }
                persona={
                    detailPerson &&
                        canManagePerson(detailPerson)
                        ? detailPerson
                        : null
                }
                onEdit={(persona) => {
                    setDetailPerson(null);
                    handleEdit(persona);
                }}
            />

            <AppConfirmDialog
                isOpen={!!toggleTarget}
                onClose={() => {
                    if (!toggling) {
                        setToggleTarget(null);
                    }
                }}
                onConfirm={handleToggle}
                title={
                    toggleTarget?.activo
                        ? 'Desactivar persona'
                        : 'Activar persona'
                }
                message={
                    toggleTarget?.activo
                        ? `¿Desactivar a "${toggleTarget.nombre}"? Su historial se conservará.`
                        : `¿Reactivar a "${toggleTarget?.nombre}"?`
                }
                confirmText={
                    toggleTarget?.activo
                        ? 'Desactivar'
                        : 'Reactivar'
                }
                variant={
                    toggleTarget?.activo
                        ? 'danger'
                        : 'primary'
                }
                loading={toggling}
            />
        </div>
    );
};
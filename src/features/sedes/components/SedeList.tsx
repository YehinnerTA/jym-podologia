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

import { useAuth } from '../../auth/context/AuthContext';
import { useSedes, SedeEstadoFilter } from '../hooks/useSedes';

import { Sede } from '../sede';
import { sedeService } from '../services/sedeService';

import { SedeForm } from './SedeForm';
import { SedeDetail } from './SedeDetail';
import { SedeCard } from './SedeCard';

import '../sede.css';

export const SedeList: React.FC = () => {
    const {
        user,
        role,
        isAuthenticated,
        isLoading: authLoading,
    } = useAuth();

    const {
        sedes,
        totalSedes,
        isLoading,
        error,
        search,
        setSearch,
        estadoFilter,
        setEstadoFilter,
        currentPage,
        totalPages,
        itemsPerPage,
        setCurrentPage,
        refresh,
    } = useSedes();

    const [formOpen, setFormOpen] = useState(false);
    const [editingSede, setEditingSede] = useState<Sede | null>(null);
    const [detailSede, setDetailSede] = useState<Sede | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Sede | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [actionError, setActionError] = useState('');

    const canManageSedes =
        isAuthenticated &&
        role === 'admin' &&
        !!user;

    const handleNew = () => {
        if (!canManageSedes) return;

        setActionError('');
        setEditingSede(null);
        setFormOpen(true);
    };

    const handleEdit = (sede: Sede) => {
        if (!canManageSedes) return;

        setActionError('');
        setEditingSede(sede);
        setFormOpen(true);
    };

    const handleRequestDelete = (sede: Sede) => {
        if (!canManageSedes) return;

        setActionError('');
        setDeleteTarget(sede);
    };

    const handleDelete = async () => {
        if (!deleteTarget || !canManageSedes || deleting) {
            return;
        }

        setDeleting(true);
        setActionError('');

        try {
            await sedeService.remove(deleteTarget.id);

            setDeleteTarget(null);
            await refresh();
        } catch (error: unknown) {
            console.error(
                'Error eliminando sede:',
                error
            );

            setActionError(
                error instanceof Error
                    ? error.message
                    : 'No se pudo eliminar la sede.'
            );

            setDeleteTarget(null);
        } finally {
            setDeleting(false);
        }
    };

    const handleFormSuccess = () => {
        setFormOpen(false);
        setEditingSede(null);
        setActionError('');
        void refresh();
    };

    if (authLoading || isLoading) {
        return (
            <div className="sede-page">
                <AppCard padding="md">
                    <AppLoader message="Cargando sedes..." />
                </AppCard>
            </div>
        );
    }

    if (!canManageSedes) {
        return (
            <div className="sede-page">
                <AppCard padding="lg">
                    <AppEmptyState
                        icon="fa-solid fa-lock"
                        title="Acceso restringido"
                        message="No tienes permisos para administrar las sedes."
                    />
                </AppCard>
            </div>
        );
    }

    return (
        <div className="sede-page">
            <div className="sede-header">
                <div>
                    <h1 className="sede-title">
                        Sedes
                    </h1>

                    <p className="sede-subtitle">
                        Gestiona las sedes de J&M Podología
                    </p>
                </div>

                <AppButton
                    variant="primary"
                    icon="fa-solid fa-plus"
                    iconPosition="left"
                    onClick={handleNew}
                >
                    Nueva Sede
                </AppButton>
            </div>

            {(error || actionError) && (
                <div
                    className="sede-form-api-error"
                    role="alert"
                >
                    <i className="fa-solid fa-circle-exclamation"></i>
                    <span>{actionError || error}</span>
                </div>
            )}

            <AppCard
                padding="md"
                className="sede-filters-card"
            >
                <div className="sede-filters">
                    <div className="sede-filters-search">
                        <AppSearchInput
                            value={search}
                            onChange={setSearch}
                            placeholder="Buscar por nombre o dirección..."
                        />
                    </div>

                    <div className="sede-filters-select">
                        <AppSelect
                            value={estadoFilter}
                            onChange={(value) =>
                                setEstadoFilter(
                                    value as SedeEstadoFilter
                                )
                            }
                            options={[
                                {
                                    value: 'todas',
                                    label: 'Todas',
                                },
                                {
                                    value: 'activas',
                                    label: 'Activas',
                                },
                                {
                                    value: 'inactivas',
                                    label: 'Inactivas',
                                },
                            ]}
                            placeholder="Estado"
                        />
                    </div>
                </div>
            </AppCard>

            {sedes.length === 0 ? (
                <AppCard padding="lg">
                    <AppEmptyState
                        icon="fa-solid fa-hospital"
                        title={
                            error
                                ? 'No se pudieron cargar las sedes'
                                : search ||
                                    estadoFilter !== 'activas'
                                    ? 'Sin resultados'
                                    : 'No hay sedes registradas'
                        }
                        message={
                            error
                                ? 'Verifica tus permisos de acceso e inténtalo nuevamente.'
                                : search ||
                                    estadoFilter !== 'activas'
                                    ? 'Prueba ajustando los filtros de búsqueda.'
                                    : 'Registra una sede para comenzar.'
                        }
                        action={
                            !error &&
                                !search &&
                                estadoFilter === 'activas' ? (
                                <AppButton
                                    variant="primary"
                                    icon="fa-solid fa-plus"
                                    iconPosition="left"
                                    onClick={handleNew}
                                >
                                    Crear sede
                                </AppButton>
                            ) : undefined
                        }
                    />
                </AppCard>
            ) : (
                <>
                    <div className="sede-grid">
                        {sedes.map((sede) => (
                            <SedeCard
                                key={sede.id}
                                sede={sede}
                                onView={setDetailSede}
                                onEdit={handleEdit}
                                onDelete={handleRequestDelete}
                            />
                        ))}
                    </div>

                    <AppPagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalSedes}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                    />
                </>
            )}

            <SedeForm
                key={editingSede?.id || 'new'}
                isOpen={formOpen}
                onClose={() => {
                    setFormOpen(false);
                    setEditingSede(null);
                }}
                sede={editingSede}
                onSuccess={handleFormSuccess}
            />

            <SedeDetail
                isOpen={!!detailSede}
                onClose={() => setDetailSede(null)}
                sede={detailSede}
                onEdit={(sede) => {
                    setDetailSede(null);
                    handleEdit(sede);
                }}
            />

            <AppConfirmDialog
                isOpen={!!deleteTarget}
                onClose={() => {
                    if (!deleting) {
                        setDeleteTarget(null);
                    }
                }}
                onConfirm={handleDelete}
                title="Eliminar sede"
                message={`¿Estás seguro de eliminar la sede "${deleteTarget?.nombre}"? Esta acción no se puede deshacer.`}
                confirmText="Eliminar"
                variant="danger"
                loading={deleting}
            />
        </div>
    );
};
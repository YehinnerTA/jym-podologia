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
import { useSedes, SedeEstadoFilter } from '../hooks/useSedes';
import { Sede } from '../sede';
import { sedeService } from '../services/sedeService';
import { SedeForm } from './SedeForm';
import { SedeDetail } from './SedeDetail';
import { SedeCard } from './SedeCard';
import '../sede.css';

export const SedeList: React.FC = () => {
    const {
        sedes,
        totalSedes,
        isLoading,
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

    const handleNew = () => {
        setEditingSede(null);
        setFormOpen(true);
    };

    const handleEdit = (sede: Sede) => {
        setEditingSede(sede);
        setFormOpen(true);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await sedeService.remove(deleteTarget.id);
            setDeleteTarget(null);
            refresh();
        } catch (error) {
            console.error('Error eliminando sede:', error);
        } finally {
            setDeleting(false);
        }
    };

    const handleFormSuccess = () => {
        setFormOpen(false);
        setEditingSede(null);
        refresh();
    };

    return (
        <div className="sede-page">
            <div className="sede-header">
                <div>
                    <h1 className="sede-title">Sedes</h1>
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

            <AppCard padding="md" className="sede-filters-card">
                <div className="sede-filters">
                    <div className="sede-filters-search">
                        <AppSearchInput
                            value={search}
                            onChange={setSearch}
                            placeholder="Buscar por nombre, RUC o dirección..."
                        />
                    </div>
                    <div className="sede-filters-select">
                        <AppSelect
                            value={estadoFilter}
                            onChange={(v) => setEstadoFilter(v as SedeEstadoFilter)}
                            options={[
                                { value: 'todas', label: 'Todas' },
                                { value: 'activas', label: 'Activas' },
                                { value: 'inactivas', label: 'Inactivas' },
                            ]}
                            placeholder="Estado"
                        />
                    </div>
                </div>
            </AppCard>

            {isLoading ? (
                <AppCard padding="md">
                    <AppLoader message="Cargando sedes..." />
                </AppCard>
            ) : sedes.length === 0 ? (
                <AppCard padding="lg">
                    <AppEmptyState
                        icon="fa-solid fa-hospital"
                        title={search || estadoFilter !== 'activas' ? 'Sin resultados' : 'No hay sedes registradas'}
                        message={
                            search || estadoFilter !== 'activas'
                                ? 'Prueba ajustando los filtros de búsqueda.'
                                : 'Crea tu primera sede para empezar.'
                        }
                        action={
                            !search && estadoFilter === 'activas' ? (
                                <AppButton
                                    variant="primary"
                                    icon="fa-solid fa-plus"
                                    iconPosition="left"
                                    onClick={handleNew}
                                >
                                    Crear primera sede
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
                                onDelete={setDeleteTarget}
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
                onClose={() => { setFormOpen(false); setEditingSede(null); }}
                sede={editingSede}
                onSuccess={handleFormSuccess}
            />

            <SedeDetail
                isOpen={!!detailSede}
                onClose={() => setDetailSede(null)}
                sede={detailSede}
                onEdit={(s) => {
                    setDetailSede(null);
                    handleEdit(s);
                }}
            />

            <AppConfirmDialog
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
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
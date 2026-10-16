import React, {
    useState,
    useEffect,
} from 'react';

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
import { useCompany } from '../../company/context/CompanyContext';

import {
    useServices,
    ServicioEstadoFiltro,
} from '../hooks/useServices';

import {
    Servicio,
    ServicioCategoria,
    SERVICIO_CATEGORIA_LABELS,
} from '../service';

import { serviceService } from '../services/serviceService';

import { ServiceCard } from './ServiceCard';
import { ServiceForm } from './ServiceForm';
import { ServiceDetail } from './ServiceDetail';

import '../../people/people.css';

export const ServiceList: React.FC = () => {
    const { role } = useAuth();

    const {
        sedes,
        selectedSede,
    } = useCompany();

    const isAdmin = role === 'admin';

    const [search, setSearch] = useState('');

    const [estadoFilter, setEstadoFilter] =
        useState<ServicioEstadoFiltro>('activos');

    const [sedeFilter, setSedeFilter] =
        useState(selectedSede || '');

    const [categoriaFilter, setCategoriaFilter] =
        useState('');

    useEffect(() => {
        setSedeFilter(selectedSede || '');
    }, [selectedSede]);

    const {
        servicios,
        totalServicios,
        isLoading,
        error,
        currentPage,
        totalPages,
        itemsPerPage,
        setCurrentPage,
    } = useServices({
        search,
        estadoFilter,
        sedeFilter,
        categoriaFilter,
    });

    const [formOpen, setFormOpen] =
        useState(false);

    const [editingService, setEditingService] =
        useState<Servicio | null>(null);

    const [detailService, setDetailService] =
        useState<Servicio | null>(null);

    const [toggleTarget, setToggleTarget] =
        useState<Servicio | null>(null);

    const [toggling, setToggling] =
        useState(false);

    const [actionError, setActionError] =
        useState('');

    const handleNew = () => {
        if (!isAdmin) return;

        setActionError('');
        setEditingService(null);
        setFormOpen(true);
    };

    const handleEdit = (servicio: Servicio) => {
        if (!isAdmin) return;

        setActionError('');
        setDetailService(null);
        setEditingService(servicio);
        setFormOpen(true);
    };

    const handleCloseForm = () => {
        setFormOpen(false);
        setEditingService(null);
    };

    const handleFormSuccess = () => {
        handleCloseForm();
    };

    const handleToggle = async () => {
        if (
            !toggleTarget ||
            !isAdmin ||
            toggling
        ) {
            return;
        }

        setToggling(true);
        setActionError('');

        try {
            await serviceService.setActivo(
                toggleTarget.id,
                !toggleTarget.activo
            );

            setToggleTarget(null);

        } catch (err) {
            console.error(
                'Error cambiando estado del servicio:',
                err
            );

            setActionError(
                err instanceof Error
                    ? err.message
                    : 'No se pudo actualizar el estado del servicio.'
            );

            setToggleTarget(null);
        } finally {
            setToggling(false);
        }
    };

    const categoriaOptions = [
        {
            value: '',
            label: 'Todas las categorías',
        },
        ...(
            Object.entries(SERVICIO_CATEGORIA_LABELS) as [
                ServicioCategoria,
                string
            ][]
        ).map(([value, label]) => ({
            value,
            label,
        })),
    ];

    const sedeOptions = [
        {
            value: '',
            label: 'Todas las sedes',
        },
        ...sedes.map((sede) => ({
            value: sede.id,
            label: sede.nombre,
        })),
    ];

    if (!isAdmin) {
        return (
            <div className="person-page">
                <AppCard padding="lg">
                    <AppEmptyState
                        icon="fa-solid fa-lock"
                        title="Acceso restringido"
                        message="Solo los administradores pueden gestionar los servicios y tratamientos."
                    />
                </AppCard>
            </div>
        );
    }

    return (
        <div className="person-page">
            {/* Encabezado */}
            <div className="person-header">
                <div>
                    <h1 className="person-title">
                        Servicios y Tratamientos
                    </h1>

                    <p className="person-subtitle">
                        Administra los tratamientos,
                        precios, duraciones y sedes vinculadas.
                    </p>
                </div>

                <AppButton
                    variant="primary"
                    icon="fa-solid fa-plus"
                    iconPosition="left"
                    onClick={handleNew}
                >
                    Nuevo Servicio
                </AppButton>
            </div>

            {/* Filtros */}
            <AppCard
                padding="md"
                className="person-filters-card"
            >
                <div
                    className="person-filters"
                    style={{
                        gridTemplateColumns:
                            'repeat(auto-fit, minmax(180px, 1fr))',
                    }}
                >
                    <AppSearchInput
                        value={search}
                        onChange={setSearch}
                        placeholder="Buscar tratamiento..."
                    />

                    <AppSelect
                        value={categoriaFilter}
                        onChange={setCategoriaFilter}
                        options={categoriaOptions}
                        placeholder="Categoría"
                    />

                    <AppSelect
                        value={sedeFilter}
                        onChange={setSedeFilter}
                        options={sedeOptions}
                        placeholder="Sede"
                    />

                    <AppSelect
                        value={estadoFilter}
                        onChange={(value) =>
                            setEstadoFilter(
                                value as ServicioEstadoFiltro
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

            {/* Mensajes de error */}
            {(error || actionError) && (
                <div
                    className="person-form-api-error"
                    role="alert"
                    style={{
                        marginBottom: '1rem',
                    }}
                >
                    <i className="fa-solid fa-circle-exclamation" />
                    <span>{actionError || error}</span>
                </div>
            )}

            {/* Contenido */}
            {isLoading ? (
                <AppCard padding="md">
                    <AppLoader
                        message="Cargando servicios..."
                    />
                </AppCard>
            ) : error ? (
                <AppCard padding="lg">
                    <AppEmptyState
                        icon="fa-solid fa-circle-exclamation"
                        title="No se pudieron cargar los servicios"
                        message="Comprueba tu conexión y los permisos de Firebase."
                    />
                </AppCard>
            ) : servicios.length === 0 ? (
                <AppCard padding="lg">
                    <AppEmptyState
                        icon="fa-solid fa-stethoscope"
                        title="Sin resultados"
                        message={
                            search ||
                                categoriaFilter ||
                                estadoFilter !== 'activos' ||
                                sedeFilter
                                ? 'No se encontraron servicios con los filtros seleccionados.'
                                : 'Todavía no hay servicios registrados.'
                        }
                        action={
                            !search &&
                                !categoriaFilter ? (
                                <AppButton
                                    variant="primary"
                                    icon="fa-solid fa-plus"
                                    iconPosition="left"
                                    onClick={handleNew}
                                >
                                    Crear servicio
                                </AppButton>
                            ) : undefined
                        }
                    />
                </AppCard>
            ) : (
                <>
                    <div className="person-grid">
                        {servicios.map((servicio) => (
                            <ServiceCard
                                key={servicio.id}
                                servicio={servicio}
                                onView={setDetailService}
                                onEdit={handleEdit}
                                onToggleActivo={setToggleTarget}
                            />
                        ))}
                    </div>

                    <AppPagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalServicios}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                    />
                </>
            )}

            {/* Crear o editar */}
            <ServiceForm
                key={editingService?.id || 'new'}
                isOpen={formOpen}
                onClose={handleCloseForm}
                servicio={editingService}
                onSuccess={handleFormSuccess}
            />

            {/* Detalles */}
            <ServiceDetail
                isOpen={!!detailService}
                onClose={() => setDetailService(null)}
                servicio={detailService}
                onEdit={handleEdit}
            />

            {/* Cambiar estado */}
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
                        ? 'Desactivar servicio'
                        : 'Activar servicio'
                }
                message={
                    toggleTarget?.activo
                        ? `¿Deseas desactivar "${toggleTarget.nombre}"? El servicio dejará de estar disponible para nuevas citas, pero conservará su historial.`
                        : `¿Deseas activar "${toggleTarget?.nombre}"? Volverá a estar disponible para nuevas citas en sus sedes vinculadas.`
                }
                confirmText={
                    toggleTarget?.activo
                        ? 'Desactivar'
                        : 'Activar'
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
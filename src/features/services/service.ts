export type ServicioCategoria =
    | 'laser'
    | 'clinico'
    | 'estetica'
    | 'reflexologia'
    | 'otros';

export interface Servicio {
    id: string;

    nombre: string;
    descripcion: string;
    categoria: ServicioCategoria;

    duracionMin: number;
    precio: number;

    sedesIds: string[];
    activo: boolean;

    createdAt?: string;
    updatedAt?: string;
    createdBy?: string;
}

export type ServicioFormData = Omit<
    Servicio,
    'id' | 'createdAt' | 'updatedAt' | 'createdBy'
>;

export interface ServicioFormErrors {
    nombre?: string;
    descripcion?: string;
    categoria?: string;
    duracionMin?: string;
    precio?: string;
    sedesIds?: string;
}

export const SERVICIO_CATEGORIA_LABELS: Record<
    ServicioCategoria,
    string
> = {
    laser: 'Láser',
    clinico: 'Clínico',
    estetica: 'Estética',
    reflexologia: 'Reflexología',
    otros: 'Otros',
};

export const SERVICIO_FORM_INICIAL: ServicioFormData = {
    nombre: '',
    descripcion: '',
    categoria: 'clinico',
    duracionMin: 30,
    precio: 0,
    sedesIds: [],
    activo: true,
};
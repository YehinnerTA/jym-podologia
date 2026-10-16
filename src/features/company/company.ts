export interface Empresa {
    id: string;
    razonSocial: string;
    nombreComercial: string;
    ruc: string;
    direccionFiscal: string;
    telefono: string;
    email: string;
    activo: boolean;
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string;
}

export type EmpresaFormData = Omit<
    Empresa,
    'id' | 'createdAt' | 'updatedAt' | 'createdBy'
>;

export interface EmpresaFormErrors {
    razonSocial?: string;
    nombreComercial?: string;
    ruc?: string;
    direccionFiscal?: string;
    telefono?: string;
    email?: string;
}

export const EMPRESA_DOCUMENT_ID = 'principal';

export const EMPRESA_FORM_INICIAL: EmpresaFormData = {
    razonSocial: '',
    nombreComercial: 'J&M Podología',
    ruc: '',
    direccionFiscal: '',
    telefono: '',
    email: '',
    activo: true,
};
export interface Sede {
    id: string;           // ID del documento en Firestore
    nombre: string;       // Ej: "Sede Lima", "Sede Arequipa"
    ruc: string;          // RUC de la sede
    direccion: string;
    esPredeterminada?: boolean;
}

export interface SedeSelectorMenuProps {
    onSelect?: (sedeId: string) => void;
    redirectTo?: string;
}
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { Sede } from '../sede';

interface CompanyContextType {
    selectedSede: string | null;
    setSelectedSede: (sedeId: string) => void;
    sedes: Sede[];
    isLoading: boolean;
    getSelectedSede: () => Sede | null;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [selectedSede, setSelectedSedeState] = useState<string | null>(null);
    const [sedes, setSedes] = useState<Sede[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchSedes = async () => {
            try {
                const snap = await getDocs(collection(db, 'sedes'));
                const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Sede[];
                setSedes(data);

                const saved = localStorage.getItem('selectedSede');
                if (saved && data.some(s => s.id === saved)) {
                    setSelectedSedeState(saved);
                } else if (data.length > 0) {
                    const predeterminada = data.find(s => s.esPredeterminada);
                    setSelectedSedeState(predeterminada?.id || data[0].id);
                }
            } catch (error) {
                console.error('Error cargando sedes:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSedes();
    }, []);

    useEffect(() => {
        if (selectedSede) {
            localStorage.setItem('selectedSede', selectedSede);
        }
    }, [selectedSede]);

    const setSelectedSede = (sedeId: string) => {
        if (sedes.some(s => s.id === sedeId)) {
            setSelectedSedeState(sedeId);
        }
    };

    const getSelectedSede = (): Sede | null => {
        if (!selectedSede) return null;
        return sedes.find(s => s.id === selectedSede) || null;
    };

    return (
        <CompanyContext.Provider
            value={{
                selectedSede,
                setSelectedSede,
                sedes,
                isLoading,
                getSelectedSede,
            }}
        >
            {children}
        </CompanyContext.Provider>
    );
};

export const useCompany = () => {
    const context = useContext(CompanyContext);
    if (!context) {
        throw new Error('useCompany debe usarse dentro de CompanyProvider');
    }
    return context;
};
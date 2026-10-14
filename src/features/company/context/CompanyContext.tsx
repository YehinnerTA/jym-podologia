import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../auth/context/AuthContext';
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
    const { role, sedesIds, isAuthenticated, isLoading: authLoading } = useAuth();
    const [selectedSede, setSelectedSedeState] = useState<string | null>(null);
    const [sedes, setSedes] = useState<Sede[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;

        if (!isAuthenticated) {
            setSedes([]);
            setSelectedSedeState(null);
            setIsLoading(false);
            return;
        }

        const fetchSedes = async () => {
            setIsLoading(true);
            try {
                const snap = await getDocs(collection(db, 'sedes'));
                const todas = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Sede[];

                let permitidas: Sede[];

                if (role === 'admin') {
                    permitidas = todas;
                } else if (sedesIds && sedesIds.length > 0) {
                    permitidas = todas.filter(s => sedesIds.includes(s.id));
                } else {
                    permitidas = [];
                }

                setSedes(permitidas);

                const saved = localStorage.getItem('selectedSede');
                if (saved && permitidas.some(s => s.id === saved)) {
                    setSelectedSedeState(saved);
                } else if (permitidas.length > 0) {
                    const predeterminada = permitidas.find(s => s.esPredeterminada);
                    setSelectedSedeState(predeterminada?.id || permitidas[0].id);
                } else {
                    setSelectedSedeState(null);
                }
            } catch (error) {
                console.error('Error cargando sedes:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSedes();
    }, [authLoading, isAuthenticated, role, sedesIds.join(',')]);  // ← cambio clave

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
import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import { useCompany } from '../../company/context/CompanyContext';
import { useHeaderNotifications } from './useHeaderNotifications';
import { useHeaderMobileMenu } from './useHeaderMobileMenu';
import { NavLink } from '../header';

const LINKS_BY_ROLE: Record<string, NavLink[]> = {
    admin: [
        { name: 'Dashboard', path: '/dashboard', icon: 'fa-solid fa-chart-pie' },
        { name: 'Citas', path: '/citas', icon: 'fa-solid fa-calendar-check' },
        { name: 'Personas', path: '/personas', icon: 'fa-solid fa-users' },
        { name: 'Servicios', path: '/servicios', icon: 'fa-solid fa-stethoscope' },
        { name: 'Sedes', path: '/sedes', icon: 'fa-solid fa-hospital' },
        { name: 'Calendario', path: '/calendario', icon: 'fa-solid fa-calendar-days' },
    ],
    staff: [
        { name: 'Dashboard', path: '/dashboard', icon: 'fa-solid fa-chart-pie' },
        { name: 'Citas', path: '/citas', icon: 'fa-solid fa-calendar-check' },
        { name: 'Personas', path: '/personas', icon: 'fa-solid fa-users' },
        { name: 'Calendario', path: '/calendario', icon: 'fa-solid fa-calendar-days' },
    ],
    paciente: [
        { name: 'Dashboard', path: '/dashboard', icon: 'fa-solid fa-chart-pie' },
        { name: 'Mis Citas', path: '/citas', icon: 'fa-solid fa-calendar-check' },
    ],
};

export const useHeader = () => {
    const navigate = useNavigate();
    const { user, role, subRol, logout } = useAuth();
    const { sedes, selectedSede, setSelectedSede } = useCompany();
    const notifications = useHeaderNotifications();
    const mobileMenu = useHeaderMobileMenu();
    const nombreUsuario = user?.displayName || user?.email?.split('@')[0] || 'Usuario';
    const inicialUsuario = nombreUsuario.charAt(0).toUpperCase();

    const sedeActiva = sedes.find((s) => s.id === selectedSede) || null;
    const multiplesSedes = sedes.length > 1;

    const navLinks = useMemo(() => {
        if (!role) return [];
        return LINKS_BY_ROLE[role] || [];
    }, [role]);

    const handleLogout = useCallback(async () => {
        await logout();
        navigate('/login');
    }, [logout, navigate]);

    const handleNavigate = useCallback((path: string) => {
        navigate(path);
        mobileMenu.close();
    },
        [navigate, mobileMenu]
    );

    const handleSedeChange = useCallback((sedeId: string) => {
        setSelectedSede(sedeId);
    },
        [setSelectedSede]
    );

    const handleLogoClick = useCallback(() => {
        navigate('/dashboard');
    }, [navigate]);

    return {
        user,
        role,
        subRol,
        nombreUsuario,
        inicialUsuario,
        sedes,
        sedeActiva,
        selectedSede,
        multiplesSedes,
        handleSedeChange,
        navLinks,
        handleNavigate,
        handleLogoClick,
        ...notifications,
        mobileMenu,
        handleLogout,
    };
};
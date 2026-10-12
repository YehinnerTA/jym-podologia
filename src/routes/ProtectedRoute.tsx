import { Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth/context/AuthContext';
import { AppLoader } from '../components';

interface Props {
    children: React.ReactNode;
}

export const ProtectedRoute: React.FC<Props> = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) return <AppLoader fullScreen message="Verificando sesión..." />;
    if (!isAuthenticated) return <Navigate to="/login" replace />;

    return <>{children}</>;
};
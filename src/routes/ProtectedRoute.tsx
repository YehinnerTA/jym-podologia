import { Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth/context/AuthContext';
import { AppLoader } from '../components';

interface Props {
    children: React.ReactNode;
    allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<Props> = ({
    children,
    allowedRoles,
}) => {
    const {
        isAuthenticated,
        isLoading,
        role,
    } = useAuth();

    if (isLoading) {
        return (
            <AppLoader
                fullScreen
                message="Verificando sesión..."
            />
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (
        allowedRoles &&
        (!role || !allowedRoles.includes(role))
    ) {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
};
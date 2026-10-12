import { Routes, Route, Navigate } from 'react-router-dom';
import { Login } from '../features/auth/components/Login';
import { SelectSede } from '../features/company/components/SelectSede';
import { ProtectedRoute } from './ProtectedRoute';

export const AppRoutes: React.FC = () => {
    return (
        <Routes>
            {/* Públicas */}
            <Route path="/login" element={<Login />} />

            {/* Protegidas */}
            <Route
                path="/select-sede"
                element={
                    <ProtectedRoute>
                        <SelectSede />
                    </ProtectedRoute>
                }
            />

            {/* Placeholder temporal para /dashboard */}
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <div style={{ padding: '2rem', color: 'white' }}>
                            Dashboard en construcción...
                        </div>
                    </ProtectedRoute>
                }
            />

            {/* Redirecciones */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
};
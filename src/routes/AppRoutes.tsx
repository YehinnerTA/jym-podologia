import { Routes, Route, Navigate } from 'react-router-dom';
import { Login } from '../features/auth/components/Login';
import { SelectSede } from '../features/company/components/SelectSede';
import { ProtectedRoute } from './ProtectedRoute';
import { SedeList } from '../features/sedes/components/SedeList';
import { PersonList } from '../features/people/components/PersonList';
import MainLayout from '../pages/partials/MainLayout';

export const AppRoutes: React.FC = () => {
    return (
        <Routes>
            {/* Públicas */}
            <Route path="/login" element={<Login />} />

            {/* Selector de sede */}
            <Route
                path="/select-sede"
                element={
                    <ProtectedRoute>
                        <SelectSede />
                    </ProtectedRoute>
                }
            />

            {/* Módulos internos */}
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <MainLayout>
                            <div style={{ padding: '2rem' }}>
                                <h1>Dashboard en construcción</h1>
                            </div>
                        </MainLayout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/sedes"
                element={
                    <ProtectedRoute>
                        <MainLayout>
                            <SedeList />
                        </MainLayout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/personas"
                element={
                    <ProtectedRoute>
                        <MainLayout>
                            <PersonList />
                        </MainLayout>
                    </ProtectedRoute>
                }
            />

            {/* Redirecciones */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
};
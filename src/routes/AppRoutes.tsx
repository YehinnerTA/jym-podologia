import { Routes, Route, Navigate } from 'react-router-dom';
import { Login } from '../features/auth/components/Login';
import { SelectSede } from '../features/company/components/SelectSede';
import { ProtectedRoute } from './ProtectedRoute';
import { SedeList } from '../features/sedes/components/SedeList';
import { PersonList } from '../features/people/components/PersonList';
import { AppointmentList } from '../features/appointments/components/AppointmentList';
import { ServiceList } from '../features/services/components/ServiceList';
import MainLayout from '../pages/partials/MainLayout';

export const AppRoutes: React.FC = () => {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />

            <Route
                path="/select-sede"
                element={
                    <ProtectedRoute>
                        <SelectSede />
                    </ProtectedRoute>
                }
            />

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

            <Route
                path="/citas"
                element={
                    <ProtectedRoute>
                        <MainLayout>
                            <AppointmentList />
                        </MainLayout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/servicios"
                element={
                    <ProtectedRoute allowedRoles={['admin']}>
                        <MainLayout>
                            <ServiceList />
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
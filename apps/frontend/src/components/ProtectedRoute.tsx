import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '@maris-nails/shared';
// import { UserRole } from '@maris-nails/shared'; // Asegúrate de que esto esté disponible

interface ProtectedRouteProps {
    requiredRole?: UserRole;
}

export const ProtectedRoute = ({ requiredRole }: ProtectedRouteProps) => {
    const { user, isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return <div>Cargando...</div>; // O un spinner
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (requiredRole && user?.role !== requiredRole) {
        // Si el usuario no tiene el rol requerido, redirigir a home o dashboard de estudiante
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};

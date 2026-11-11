import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '@maris-nails/shared';
// import { UserRole } from '@maris-nails/shared'; // Asegúrate de que esto esté disponible

interface ProtectedRouteProps {
    requiredRole?: UserRole;
}

export const ProtectedRoute = ({ requiredRole }: ProtectedRouteProps) => {
    const { user, isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return <div>Cargando...</div>; // O un spinner
    }

    if (!isAuthenticated) {
        // El login devuelve aquí después de entrar (enlaces de correos, barra inferior).
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    if (requiredRole && user?.role !== requiredRole) {
        // Si el usuario no tiene el rol requerido, redirigir a su portal de alumna
        return <Navigate to="/mis-cursos" replace />;
    }

    return <Outlet />;
};

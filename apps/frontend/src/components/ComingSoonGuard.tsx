import { useAuth } from '../context/AuthContext';
import { UserRole } from '@maris-nails/shared';
import { ComingSoonPage } from '../pages/ComingSoonPage';

interface ComingSoonGuardProps {
    children: React.ReactNode;
}

/**
 * ComingSoonGuard
 *
 * Actúa como portero para las rutas públicas durante el modo "próximamente".
 *
 * Lógica:
 *  - ADMIN → ve la página real (puede evaluar cambios)
 *  - Cualquier otro usuario → ve la página de próximamente
 *
 * Esto nos permite tener el sitio "cerrado" para el público
 * sin bloquear al administrador que necesita revisar el progreso.
 */
export const ComingSoonGuard = ({ children }: ComingSoonGuardProps) => {
    const { user, isLoading } = useAuth();

    if (isLoading) return null;

    if (user?.role === UserRole.ADMIN) {
        return <>{children}</>;
    }

    return <ComingSoonPage />;
};

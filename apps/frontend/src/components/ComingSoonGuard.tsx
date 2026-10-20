import { useAuth } from '../context/AuthContext';
import { canSeePublicSite } from '../lib/public-site';
import { ComingSoonPage } from '../pages/ComingSoonPage';

interface ComingSoonGuardProps {
    children: React.ReactNode;
}

/**
 * Portero de las rutas públicas durante el modo "próximamente": muestra la
 * página real a quien canSeePublicSite() deja pasar y "Próximamente" al resto.
 */
export const ComingSoonGuard = ({ children }: ComingSoonGuardProps) => {
    const { user, isLoading } = useAuth();

    if (isLoading) return null;

    if (canSeePublicSite(user)) {
        return <>{children}</>;
    }

    return <ComingSoonPage />;
};

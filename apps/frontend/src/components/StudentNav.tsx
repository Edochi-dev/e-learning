import { NavLink, Outlet } from 'react-router-dom';
import { Award, BookOpen, UserRound, type LucideIcon } from 'lucide-react';
import { UserRole } from '@maris-nails/shared';
import { useAuth } from '../context/AuthContext';

interface Destination {
    to: string;
    label: string;
    Icon: LucideIcon;
}

/** Destinos de estudio: la cabecera y la barra inferior salen de esta lista. */
const LEARNING: Destination[] = [
    { to: '/mis-cursos', label: 'Mis cursos', Icon: BookOpen },
    { to: '/mis-certificados', label: 'Mis certificados', Icon: Award },
];

const ACCOUNT: Destination = { to: '/cuenta', label: 'Cuenta', Icon: UserRound };

/** Enlaces de la alumna en la cabecera; el CSS los oculta cuando se muestra la barra inferior. */
export const StudentHeaderLinks = () => {
    const { user } = useAuth();
    if (user?.role !== UserRole.STUDENT) return null;

    return (
        <nav className="nav-links nav-links--student" aria-label="Mi aprendizaje">
            {LEARNING.map(({ to, label }) => (
                <NavLink key={to} to={to}>{label}</NavLink>
            ))}
        </nav>
    );
};

/**
 * Barra inferior de la alumna. Sin sesión no se muestra: sus destinos estarían
 * vacíos y "Ingresar" ya está en la cabecera. Las admin tienen su panel.
 */
const StudentTabBar = () => {
    const { user } = useAuth();
    if (user?.role !== UserRole.STUDENT) return null;

    const destinations = [...LEARNING, ACCOUNT];

    return (
        <nav className="tab-bar" aria-label="Mi aprendizaje">
            {destinations.map(({ to, label, Icon }) => (
                <NavLink key={to} to={to} className="tab-bar__item">
                    <Icon className="tab-bar__icon" aria-hidden />
                    <span>{label}</span>
                </NavLink>
            ))}
        </nav>
    );
};

/**
 * Ruta de layout para las páginas con barra inferior. El reproductor de
 * lecciones se declara fuera: ahí la pantalla es del video.
 */
export const StudentTabBarLayout = () => (
    <>
        <Outlet />
        <StudentTabBar />
    </>
);

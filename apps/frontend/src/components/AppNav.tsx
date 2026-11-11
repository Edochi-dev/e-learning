import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Award, BookOpen, House, LayoutDashboard, PenLine, UserRound, type LucideIcon } from 'lucide-react';
import { UserRole } from '@maris-nails/shared';
import { useAuth } from '../context/AuthContext';
import type { CorrectionGateway } from '../gateways/CorrectionGateway';
import { usePendingCorrectionsCount } from '../hooks/usePendingCorrectionsCount';

interface Destination {
    to: string;
    label: string;
    Icon: LucideIcon;
    /** Solo activo en la ruta exacta (p. ej. "/" no debe quedar activo en todo el sitio). */
    end?: boolean;
    /** Regla propia de "activo" cuando un destino abarca rutas que no comparten prefijo exclusivo. */
    isActive?: (pathname: string) => boolean;
}

/** Destinos de estudio: la cabecera y la barra inferior salen de esta lista. */
const LEARNING: Destination[] = [
    { to: '/mis-cursos', label: 'Mis cursos', Icon: BookOpen },
    { to: '/mis-certificados', label: 'Mis certificados', Icon: Award },
];

const ACCOUNT: Destination = { to: '/cuenta', label: 'Cuenta', Icon: UserRound };

/** Destinos de la barra inferior según el rol; sin entrada, no hay barra (visitantes). */
const TAB_BAR: Partial<Record<UserRole, Destination[]>> = {
    [UserRole.STUDENT]: [...LEARNING, ACCOUNT],
    [UserRole.ADMIN]: [
        { to: '/', label: 'Inicio', Icon: House, end: true },
        {
            to: '/admin',
            label: 'Panel',
            Icon: LayoutDashboard,
            // Todo /admin/* menos correcciones, que tiene su propia pestaña.
            isActive: (p) => p.startsWith('/admin') && !p.startsWith('/admin/correcciones'),
        },
        { to: '/admin/correcciones', label: 'Correcciones', Icon: PenLine },
        ACCOUNT,
    ],
};

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

interface TabBarProps {
    correctionGateway: CorrectionGateway;
}

/**
 * Publica en --tab-bar-space el alto real de la barra. Con letra grande una
 * etiqueta parte en dos líneas y la barra crece; la reserva al final de la
 * página (y el alto del diseñador) debe crecer con ella o tapa el pie.
 * Sin la franja del iPhone: la reserva la suma aparte.
 */
const publishBarHeight = (bar: HTMLElement | null) => {
    if (!bar) return;
    const root = document.documentElement.style;
    const observer = new ResizeObserver(() => {
        const safeArea = parseFloat(getComputedStyle(bar).paddingBottom) || 0;
        // Oculta (escritorio, acostado) mide 0: se deja la fórmula del CSS.
        if (bar.offsetHeight === 0) root.removeProperty('--tab-bar-space');
        else root.setProperty('--tab-bar-space', `${bar.offsetHeight - safeArea}px`);
    });
    observer.observe(bar);
    return () => {
        observer.disconnect();
        root.removeProperty('--tab-bar-space');
    };
};

/**
 * Barra inferior del teléfono. Sin sesión no se muestra: sus destinos estarían
 * vacíos y "Ingresar" ya está en la cabecera. "Cerrar sesión" vive en Cuenta.
 */
const TabBar = ({ correctionGateway }: TabBarProps) => {
    const { user } = useAuth();
    const { pathname } = useLocation();
    const isAdmin = user?.role === UserRole.ADMIN;
    const pendingCorrections = usePendingCorrectionsCount(correctionGateway, isAdmin, pathname);
    const destinations = user ? TAB_BAR[user.role] : undefined;
    if (!user || !destinations) return null;

    const badges: Record<string, number> = { '/admin/correcciones': pendingCorrections };

    return (
        <nav ref={publishBarHeight} className={`tab-bar tab-bar--${user.role}`} aria-label="Navegación principal">
            {destinations.map(({ to, label, Icon, end, isActive }) => {
                const badge = badges[to] ?? 0;
                return (
                    <NavLink
                        key={to}
                        to={to}
                        end={end}
                        className={({ isActive: routeActive }) =>
                            `tab-bar__item${(isActive ? isActive(pathname) : routeActive) ? ' active' : ''}`}
                    >
                        <span className="tab-bar__icon-wrap">
                            <Icon className="tab-bar__icon" aria-hidden />
                            {badge > 0 && <span className="tab-bar__badge">{badge}</span>}
                        </span>
                        <span>
                            {label}
                            {badge > 0 && <span className="sr-only"> ({badge} {badge === 1 ? 'pendiente' : 'pendientes'})</span>}
                        </span>
                    </NavLink>
                );
            })}
        </nav>
    );
};

/**
 * Ruta de layout para las páginas con barra inferior. El reproductor de
 * lecciones se declara fuera: ahí la pantalla es del video.
 */
export const TabBarLayout = ({ correctionGateway }: TabBarProps) => (
    <>
        <Outlet />
        <TabBar correctionGateway={correctionGateway} />
    </>
);

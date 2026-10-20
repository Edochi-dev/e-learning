import { Link, Outlet } from 'react-router-dom';
import { UserRole } from '@maris-nails/shared';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { LocalStorageThemeGateway } from '../gateways/LocalStorageThemeGateway';
import { ThemeSwitch } from './ThemeSwitch';
import { UserMenu } from './UserMenu';
import { StudentHeaderLinks } from './StudentNav';
import { SiteMenu, SiteSectionLinks } from './SiteSections';
import { useSiteSections } from '../hooks/useSiteSections';
import { useLogout } from '../hooks/useLogout';
import { canSeePublicSite, homePathFor } from '../lib/public-site';

/**
 * SiteLayout — cabecera y pie comunes del sitio.
 *
 * Es una ruta de layout: envuelve a sus rutas hijas y las pinta en el <Outlet/>.
 * Las páginas que necesitan la pantalla completa —la de ventas— se declaran
 * fuera de ella en lugar de esconder la cabecera con condicionales.
 */
export const SiteLayout = () => {
    const { user } = useAuth();
    const { theme, toggleTheme } = useTheme(new LocalStorageThemeGateway());
    const sections = useSiteSections();
    const showSections = canSeePublicSite(user);
    const logout = useLogout();
    const isStudent = user?.role === UserRole.STUDENT;

    return (
        <div className="site-shell">
            <header className="header">
                <div className="container nav">
                    <Link to={homePathFor(user)} className="logo">
                        <img src="/images/logo.png" alt="" className="logo__img" />
                        <span className="logo__name"><em>Mari's Nails Academy</em></span>
                    </Link>
                    {showSections && <SiteSectionLinks sections={sections} />}
                    <StudentHeaderLinks />
                    <div className="nav-links">
                        <ThemeSwitch theme={theme} toggleTheme={toggleTheme} />
                        {(showSections || isStudent) && (
                            <SiteMenu
                                sections={showSections ? sections : []}
                                onLogout={isStudent ? logout : undefined}
                            />
                        )}
                        {user ? (
                            <UserMenu />
                        ) : (
                            <Link to="/login" className="btn-primary nav-login">
                                Ingresar
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            <main>
                <Outlet />
            </main>

            <footer className="footer">
                <div className="container">
                    <p>© {new Date().getFullYear()} Mari's Nails Academy. Todos los derechos reservados.</p>
                </div>
            </footer>
        </div>
    );
};

import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { UserRole } from '@maris-nails/shared';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { LocalStorageThemeGateway } from '../gateways/LocalStorageThemeGateway';
import { ThemeSwitch } from './ThemeSwitch';
import { UserMenu } from './UserMenu';
import { smoothScrollToElement, getHeaderOffset } from '../lib/smoothScroll';

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
    const navigate = useNavigate();
    const location = useLocation();

    // Enlace del header a una sección de la landing (Contacto, Preguntas, etc.).
    // Si ya estamos en la home, hace scroll suave; si no, navega a la home y deja
    // en el state qué sección abrir (la home lo lee y hace el scroll al montar).
    function handleSectionLink(e: React.MouseEvent, sectionId: string) {
        e.preventDefault();
        if (location.pathname === '/') {
            smoothScrollToElement(sectionId, { offset: getHeaderOffset() });
        } else {
            navigate('/', { state: { scrollTo: sectionId } });
        }
    }

    return (
        <>
            <header className="header">
                <div className="container nav">
                    <Link to="/" className="logo">
                        <img src="/images/logo.png" alt="" className="logo__img" />
                        <span className="logo__name"><em>Mari's Nails Academy</em></span>
                    </Link>
                    <nav className="nav-links">
                        {user?.role === UserRole.ADMIN && (
                            <>
                                <Link to="/cursos">Cursos</Link>
                                <a href="#preguntas" onClick={(e) => handleSectionLink(e, 'preguntas')}>Preguntas frecuentes</a>
                                <a href="#contacto" onClick={(e) => handleSectionLink(e, 'contacto')}>Contacto</a>
                            </>
                        )}
                        <ThemeSwitch theme={theme} toggleTheme={toggleTheme} />
                        {user ? (
                            <UserMenu />
                        ) : (
                            <Link to="/login" className="btn-primary" style={{ padding: '0.5rem 1rem', color: 'white' }}>
                                Ingresar
                            </Link>
                        )}
                    </nav>
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
        </>
    );
};

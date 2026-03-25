import { useRef, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserRole } from '@maris-nails/shared';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from './UserAvatar';

/**
 * UserMenu — Dropdown del navbar para el usuario autenticado.
 *
 * Estructura visual:
 *   [ AC ▾ ]  ← botón con avatar + flecha
 *      ↓ (al hacer clic)
 *   ┌──────────────────┐
 *   │ Ana García        │  ← nombre del usuario
 *   │ ana@email.com     │  ← email
 *   ├──────────────────┤
 *   │ 📚 Mis Cursos     │
 *   │ ⚙️  Mi Cuenta     │
 *   │ 🛡️ Panel Admin    │  ← solo si es ADMIN
 *   ├──────────────────┤
 *   │ 🚪 Cerrar Sesión  │
 *   └──────────────────┘
 *
 * ¿Cómo funciona el "cerrar al hacer clic fuera"?
 *   Usamos un ref (containerRef) para referenciar el div contenedor.
 *   En un useEffect, añadimos un event listener al documento que escucha
 *   todos los clics. Cuando ocurre un clic, preguntamos: ¿está ese clic
 *   DENTRO del contenedor? Si no lo está, cerramos el menú.
 *   Al desmontar el componente, limpiamos el listener para evitar memory leaks.
 */
export const UserMenu = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Cerrar el menú al hacer clic fuera de él
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // contains() comprueba si el elemento clicado está dentro del contenedor
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        // 'mousedown' en lugar de 'click' para que cierre antes de que el
        // nuevo elemento reciba el foco — mejor experiencia de usuario
        document.addEventListener('mousedown', handleClickOutside);

        // Función de limpieza: se ejecuta cuando el componente se desmonta
        // o antes de que el efecto se re-ejecute. Sin esto, acumularíamos
        // listeners y tendríamos un memory leak.
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!user) return null;

    const handleLogout = () => {
        setIsOpen(false);
        logout();
        navigate('/');
    };

    const handleNavigation = () => setIsOpen(false);

    return (
        <div className="user-menu" ref={containerRef}>
            {/* Botón que abre/cierra el dropdown */}
            <button
                className="user-menu__trigger"
                onClick={() => setIsOpen((prev) => !prev)}
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                <UserAvatar name={user.fullName} size="sm" />
                {/* La flecha rota 180° cuando el menú está abierto (controlado por CSS) */}
                <span className={`user-menu__arrow ${isOpen ? 'user-menu__arrow--open' : ''}`}>
                    ▾
                </span>
            </button>

            {/* Dropdown — solo se renderiza cuando isOpen es true */}
            {isOpen && (
                <div className="user-menu__dropdown" role="menu">
                    {/* Cabecera con info del usuario */}
                    <div className="user-menu__header">
                        <p className="user-menu__name">{user.fullName}</p>
                        <p className="user-menu__email">{user.email}</p>
                    </div>

                    <div className="user-menu__divider" />

                    {/* Navegación */}
                    <Link
                        to="/mis-cursos"
                        className="user-menu__item"
                        role="menuitem"
                        onClick={handleNavigation}
                    >
                        <span className="user-menu__item-icon">📚</span>
                        <span>Mis Cursos</span>
                    </Link>

                    <Link
                        to="/cuenta"
                        className="user-menu__item"
                        role="menuitem"
                        onClick={handleNavigation}
                    >
                        <span className="user-menu__item-icon">⚙️</span>
                        <span>Mi Cuenta</span>
                    </Link>

                    {/* Solo visible para administradores */}
                    {user.role === UserRole.ADMIN && (
                        <Link
                            to="/admin"
                            className="user-menu__item"
                            role="menuitem"
                            onClick={handleNavigation}
                        >
                            <span className="user-menu__item-icon">🛡️</span>
                            <span>Panel Admin</span>
                        </Link>
                    )}

                    <div className="user-menu__divider" />

                    {/* Cerrar sesión — botón, no link, porque es una acción, no una navegación */}
                    <button
                        className="user-menu__item user-menu__item--danger"
                        role="menuitem"
                        onClick={handleLogout}
                    >
                        <span className="user-menu__item-icon">🚪</span>
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            )}
        </div>
    );
};

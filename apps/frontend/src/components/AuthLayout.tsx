import type { ReactNode } from 'react';
import { Card } from './Card';

interface AuthLayoutProps {
    /** Admite una palabra en <em>, que se pinta con la itálica metálica de la marca. */
    title: ReactNode;
    subtitle: string;
    /** Rótulo opcional sobre el título (ej. "Bienvenida de vuelta"). */
    eyebrow?: string;
    children: ReactNode;
    /** Enlaces del pie (ej. "¿No tienes cuenta? Regístrate"). */
    footer?: ReactNode;
}

/** Contenedor común de las páginas de autenticación: logo, título y tarjeta. */
export const AuthLayout = ({ title, subtitle, eyebrow, children, footer }: AuthLayoutProps) => (
    <div className="container auth-layout">
        <Card>
            <div className="auth-layout__header">
                <img src="/images/logo-mark.png" alt="" className="auth-layout__logo" />
                {eyebrow && <p className="section-eyebrow">{eyebrow}</p>}
                <h1 className="auth-layout__title">{title}</h1>
                <p className="auth-layout__subtitle">{subtitle}</p>
            </div>

            {children}
            {footer}
        </Card>
    </div>
);

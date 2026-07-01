import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card } from './Card';

interface AuthLayoutProps {
    icon: LucideIcon;
    title: string;
    subtitle: string;
    children: ReactNode;
    /** Enlaces del pie (ej. "¿No tienes cuenta? Regístrate"). */
    footer?: ReactNode;
}

/**
 * AuthLayout — Contenedor común de las páginas de autenticación
 * (login, registro, recuperar/restablecer contraseña).
 *
 * Antes, cada una repetía el mismo bloque inline: contenedor centrado + card +
 * cabecera con icono, título en degradado y subtítulo. Extraerlo aquí elimina
 * esa duplicación y unifica el look. El icono es de lucide-react (adiós emojis).
 */
export const AuthLayout = ({ icon: Icon, title, subtitle, children, footer }: AuthLayoutProps) => (
    <div className="container" style={{ maxWidth: '520px', marginTop: '5rem', marginBottom: '3rem' }}>
        <Card>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <Icon size={44} strokeWidth={1.5} style={{ color: 'var(--primary)' }} aria-hidden="true" />
                <h2 style={{
                    marginTop: '0.75rem',
                    marginBottom: '0.25rem',
                    fontSize: '1.8rem',
                    background: 'linear-gradient(135deg, var(--primary), var(--gold))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                }}>
                    {title}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    {subtitle}
                </p>
            </div>

            {children}
            {footer}
        </Card>
    </div>
);

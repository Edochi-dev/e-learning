import type { ReactNode } from 'react';

interface BadgeProps {
    /** Variante visual — mapea a .badge-live / .badge-recorded (o base .badge). */
    variant?: 'live' | 'recorded' | 'default';
    children: ReactNode;
    className?: string;
}

/**
 * Badge — Etiqueta corta (ej. "Clases en vivo" / "Grabadas"). Envuelve las
 * clases .badge existentes para reutilizarlas de forma consistente.
 */
export const Badge = ({ variant = 'default', children, className = '' }: BadgeProps) => {
    const variantClass = variant === 'default' ? '' : `badge-${variant}`;
    return <span className={`badge ${variantClass} ${className}`}>{children}</span>;
};

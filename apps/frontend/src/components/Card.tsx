import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
}

/**
 * Card — Contenedor con la superficie/sombra/borde estándar (clase .card).
 * Envuelve la clase existente para poder pasar props nativas y componer.
 */
export const Card = ({ children, className = '', ...rest }: CardProps) => (
    <div className={`card ${className}`} {...rest}>
        {children}
    </div>
);

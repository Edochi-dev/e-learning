import type { ReactNode } from 'react';

/** Tono por significado: el color sale del sistema de diseño, no de la pantalla. */
export type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral' | 'rose' | 'gold';

interface BadgeProps {
    tone?: BadgeTone;
    children: ReactNode;
    className?: string;
}

/** Etiqueta corta de estado o tipo ("Publicado", "Borrador", "Examen"…). */
export const Badge = ({ tone = 'neutral', children, className = '' }: BadgeProps) => (
    <span className={`badge badge--${tone} ${className}`.trim()}>{children}</span>
);

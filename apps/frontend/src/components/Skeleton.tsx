import type { CSSProperties } from 'react';

interface SkeletonProps {
    width?: string;
    height?: string;
    radius?: string;
    style?: CSSProperties;
    className?: string;
}

/**
 * Skeleton — Placeholder animado (shimmer) que se muestra mientras carga el
 * contenido real. Da sensación de velocidad y evita el "salto" de layout de un
 * spinner suelto. El estilado del shimmer vive en App.css (.skeleton).
 *
 * `aria-hidden`: es decorativo; los lectores de pantalla no deben anunciarlo.
 */
export const Skeleton = ({
    width = '100%',
    height = '1rem',
    radius = 'var(--radius-md)',
    style,
    className = '',
}: SkeletonProps) => (
    <span
        className={`skeleton ${className}`}
        aria-hidden="true"
        style={{ width, height, borderRadius: radius, ...style }}
    />
);

/**
 * SkeletonCourseCard — Esqueleto con la forma de una tarjeta de curso
 * (imagen + título + línea de texto). Reutilizable en catálogo y "mis cursos".
 */
export const SkeletonCourseCard = () => (
    <div
        style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            background: 'var(--bg-elevated)',
        }}
    >
        <Skeleton height="10rem" radius="0" />
        <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <Skeleton width="40%" height="0.75rem" />
            <Skeleton width="85%" height="1.1rem" />
            <Skeleton width="100%" height="0.75rem" />
            <Skeleton width="60%" height="0.75rem" />
        </div>
    </div>
);

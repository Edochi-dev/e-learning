interface BrandMarkProps {
    /** Ancho relativo a su contenedor (p. ej. '30%'); la marca es cuadrada. */
    width: string;
    className?: string;
}

/** Marca de la academia en lugar de una imagen que falta (curso sin portada, foto pendiente). */
export const BrandMark = ({ width, className }: BrandMarkProps) => (
    <img
        src="/images/logo-mark-m.png"
        alt=""
        aria-hidden="true"
        className={className}
        style={{ width, maxWidth: 192, height: 'auto' }}
    />
);

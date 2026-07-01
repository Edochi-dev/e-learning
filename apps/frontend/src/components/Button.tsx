import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    /** Estilo visual — mapea a las clases .btn-primary / .btn-secondary. */
    variant?: 'primary' | 'secondary';
    fullWidth?: boolean;
    /** Deshabilita y muestra estado de carga. */
    loading?: boolean;
    /** Icono opcional (lucide-react) a la izquierda del texto. */
    icon?: LucideIcon;
    children: ReactNode;
}

/**
 * Button — Botón reutilizable sobre las clases existentes (.btn-*).
 *
 * Centraliza el estilado que antes se repetía inline en cada página (ancho,
 * disabled, icono). Cualquier atributo nativo (onClick, type, aria-*) se pasa
 * tal cual gracias a `...rest`.
 */
export const Button = ({
    variant = 'primary',
    fullWidth = false,
    loading = false,
    icon: Icon,
    children,
    className = '',
    disabled,
    style,
    ...rest
}: ButtonProps) => (
    <button
        className={`btn-${variant} ${className}`}
        disabled={disabled ?? loading}
        style={{ ...(fullWidth ? { width: '100%' } : {}), ...style }}
        {...rest}
    >
        {Icon && <Icon size={18} aria-hidden="true" />}
        {children}
    </button>
);

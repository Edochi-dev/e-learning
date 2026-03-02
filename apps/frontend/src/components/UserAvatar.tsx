/**
 * UserAvatar — Círculo con las iniciales del usuario y un color dinámico.
 *
 * Si el usuario tiene foto (photoUrl), la mostramos. Si no, generamos
 * un avatar con sus iniciales sobre un color derivado de su nombre.
 *
 * ¿Por qué el color es "derivado del nombre" y no aleatorio?
 *   Porque si fuera aleatorio, cambiaría en cada render.
 *   Al derivarlo del nombre con un hash, el mismo usuario siempre
 *   verá el mismo color — consistente en todos los dispositivos y sesiones.
 */

// Paleta de colores en armonía con el design system (rose pink + champagne gold + complementarios)
const PALETTE = [
    '#e84393', // rose pink (--primary)
    '#d4a574', // champagne gold (--gold)
    '#8b5e83', // mauve
    '#5c7cfa', // indigo
    '#20c997', // teal
    '#f76707', // orange
];

/**
 * getColorFromName — Convierte un nombre en un color de la paleta.
 *
 * Usa un algoritmo de hash simple (djb2) para generar un número a partir
 * del nombre. Luego usamos módulo (%) para seleccionar un color del array.
 *
 * djb2 funciona así: empieza en 0, y por cada carácter hace:
 *   hash = hash * 32 + hash + código_ascii_del_carácter
 *   (que es lo mismo que: hash << 5 - hash + charCode)
 *
 * El resultado siempre es el mismo para el mismo string. Eso lo hace un hash.
 */
function getColorFromName(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return PALETTE[Math.abs(hash) % PALETTE.length];
}

/**
 * getInitials — Extrae las iniciales del nombre completo.
 *
 * "Ana García"        → "AG"
 * "María"             → "M"
 * "Juan Carlos López" → "JL" (primera y última palabra)
 */
function getInitials(fullName: string): string {
    const parts = fullName.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface UserAvatarProps {
    name: string;
    size?: 'sm' | 'md' | 'lg';
    photoUrl?: string | null;
}

const SIZES = {
    sm: { width: 32, height: 32, fontSize: '0.75rem' },
    md: { width: 40, height: 40, fontSize: '0.9rem' },
    lg: { width: 96, height: 96, fontSize: '2rem' },
};

export const UserAvatar = ({ name, size = 'md', photoUrl }: UserAvatarProps) => {
    const { width, height, fontSize } = SIZES[size];
    const color = getColorFromName(name);
    const initials = getInitials(name);

    // Si tiene foto, la mostramos directamente
    if (photoUrl) {
        return (
            <img
                src={photoUrl}
                alt={name}
                className="user-avatar"
                style={{ width, height, borderRadius: '50%', objectFit: 'cover' }}
            />
        );
    }

    // Sin foto: círculo de color con iniciales blancas
    return (
        <div
            className="user-avatar"
            aria-label={`Avatar de ${name}`}
            style={{
                width,
                height,
                fontSize,
                backgroundColor: color,
                // Un degradado sutil hacia más oscuro en la parte inferior
                background: `linear-gradient(135deg, ${color}dd, ${color})`,
            }}
        >
            {initials}
        </div>
    );
};

// Exportamos las funciones para reutilizarlas en AccountPage (para el banner)
export { getColorFromName };

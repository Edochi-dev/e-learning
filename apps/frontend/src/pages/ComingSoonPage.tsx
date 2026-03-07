import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '@maris-nails/shared';
import { Navigate } from 'react-router-dom';

/**
 * ComingSoonPage
 *
 * Página de "sitio en construcción" que actúa como puerta de entrada
 * mientras la plataforma no está lista para el público general.
 *
 * Comportamiento:
 *  - Si el usuario es ADMIN → lo redirige al panel de administración
 *    (no tiene sentido mostrarle esta página a quien ya tiene acceso total)
 *  - Para todos los demás → muestra el mensaje de próximamente
 */
export const ComingSoonPage = () => {
    const { user, isLoading } = useAuth();

    if (isLoading) return null;

    // El admin no necesita ver esta página — va directo a su panel
    if (user?.role === UserRole.ADMIN) {
        return <Navigate to="/admin" replace />;
    }

    return (
        <div style={styles.wrapper}>
            <div style={styles.card}>
                <div style={styles.badge}>💅</div>

                <h1 style={styles.title}>Mari's Nails Academy</h1>

                <div style={styles.divider} />

                <p style={styles.subtitle}>Algo hermoso está por llegar</p>

                <p style={styles.body}>
                    Estamos preparando una experiencia única para ti.
                    Muy pronto tendrás acceso a cursos, lecciones y mucho más.
                </p>

                <div style={styles.tagline}>
                    ✨ Próximamente disponible ✨
                </div>

                <Link to="/login" style={styles.loginLink}>
                    Acceso administradores
                </Link>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    wrapper: {
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
    },
    card: {
        background: 'var(--bg-elevated)',
        border: '1px solid var(--gold)',
        borderRadius: '1.5rem',
        padding: '3rem 2.5rem',
        maxWidth: '520px',
        width: '100%',
        textAlign: 'center',
        boxShadow: 'var(--shadow-gold)',
    },
    badge: {
        fontSize: '3.5rem',
        marginBottom: '1rem',
        display: 'block',
    },
    title: {
        fontFamily: 'var(--font-heading)',
        color: 'var(--primary)',
        fontSize: '2rem',
        margin: '0 0 1rem',
    },
    divider: {
        width: '60px',
        height: '2px',
        background: 'linear-gradient(90deg, var(--primary), var(--gold))',
        margin: '0 auto 1.5rem',
        borderRadius: '2px',
    },
    subtitle: {
        fontFamily: 'var(--font-heading)',
        color: 'var(--gold)',
        fontSize: '1.2rem',
        margin: '0 0 1rem',
        fontStyle: 'italic',
    },
    body: {
        color: 'var(--text-secondary)',
        lineHeight: '1.7',
        margin: '0 0 2rem',
        fontSize: '1rem',
    },
    tagline: {
        color: 'var(--primary)',
        fontWeight: 600,
        fontSize: '0.95rem',
        letterSpacing: '0.05em',
        marginBottom: '2rem',
    },
    loginLink: {
        display: 'inline-block',
        color: 'var(--text-muted)',
        fontSize: '0.8rem',
        textDecoration: 'none',
        borderBottom: '1px dotted var(--text-muted)',
        paddingBottom: '1px',
    },
};

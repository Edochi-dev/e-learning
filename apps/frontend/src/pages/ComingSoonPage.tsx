import { Link } from 'react-router-dom';

/**
 * ComingSoonPage
 *
 * Página de "sitio en construcción" para el público general.
 * El acceso de administradores a rutas protegidas se maneja
 * en ComingSoonGuard, no aquí.
 */
export const ComingSoonPage = () => {
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

            {/* Card secundaria: búsqueda de certificado */}
            <div style={styles.certCard}>
                <span style={styles.certIcon}>🎓</span>
                <div style={styles.certText}>
                    <p style={styles.certTitle}>¿Ya tienes un certificado?</p>
                    <p style={styles.certBody}>Búscalo con tu número de certificado</p>
                </div>
                <Link to="/certificados/buscar" style={styles.certLink}>
                    Ver mi certificado →
                </Link>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    wrapper: {
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        gap: '0',
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
    certCard: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: '1rem',
        padding: '1.25rem 1.5rem',
        maxWidth: '520px',
        width: '100%',
        marginTop: '1rem',
    },
    certIcon: {
        fontSize: '1.75rem',
        flexShrink: 0,
    },
    certText: {
        flex: 1,
        textAlign: 'left' as const,
    },
    certTitle: {
        margin: 0,
        fontWeight: 600,
        fontSize: '0.95rem',
        color: 'var(--text)',
    },
    certBody: {
        margin: '0.15rem 0 0',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
    },
    certLink: {
        flexShrink: 0,
        color: 'var(--primary)',
        fontWeight: 600,
        fontSize: '0.9rem',
        textDecoration: 'none',
        whiteSpace: 'nowrap' as const,
    },
};

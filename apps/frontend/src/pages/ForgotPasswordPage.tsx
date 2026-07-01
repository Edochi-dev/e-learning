import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ForgotPasswordPage — Paso 1 del reset: el alumno pide el enlace por email.
 *
 * Mostramos SIEMPRE el mismo mensaje neutro (exista o no el correo), igual que
 * el backend, para no revelar qué cuentas están registradas.
 */
export const ForgotPasswordPage = () => {
    const { forgotPassword } = useAuth();
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await forgotPassword(email);
        } catch {
            // Silencioso: no revelamos nada. Igual mostramos el mensaje neutro.
        } finally {
            setLoading(false);
            setSent(true);
        }
    };

    return (
        <div className="container" style={{ maxWidth: '520px', marginTop: '5rem', marginBottom: '3rem' }}>
            <div className="card">
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <span style={{ fontSize: '3rem' }}>🔑</span>
                    <h2 style={{
                        marginTop: '0.75rem',
                        marginBottom: '0.25rem',
                        fontSize: '1.8rem',
                        background: 'linear-gradient(135deg, var(--primary), var(--gold))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>
                        Recuperar contraseña
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        Te enviaremos un enlace para restablecerla
                    </p>
                </div>

                {sent ? (
                    <div style={{
                        background: 'linear-gradient(135deg, #f0fff4, #e8fff0)',
                        color: '#1a7f5a',
                        padding: '1rem',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.9rem',
                        border: '1px solid rgba(26, 127, 90, 0.15)',
                        textAlign: 'center',
                    }}>
                        Si ese correo está registrado, te enviamos un enlace para restablecer
                        tu contraseña. Revisa tu bandeja de entrada (y la carpeta de spam).
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem' }}>
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="tu@email.com"
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading}
                            style={{ marginTop: '0.5rem', width: '100%', padding: '0.95rem' }}
                        >
                            {loading ? 'Enviando…' : 'Enviar enlace'}
                        </button>
                    </form>
                )}

                <p style={{
                    textAlign: 'center',
                    marginTop: '1.5rem',
                    marginBottom: 0,
                    fontSize: '0.875rem',
                    color: 'var(--text-muted)',
                }}>
                    <Link to="/login" style={{ color: 'var(--text-muted)' }}>
                        ← Volver a iniciar sesión
                    </Link>
                </p>
            </div>
        </div>
    );
};

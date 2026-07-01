import { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/Button';

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
        <AuthLayout
            icon={KeyRound}
            title="Recuperar contraseña"
            subtitle="Te enviaremos un enlace para restablecerla"
            footer={
                <p style={{ textAlign: 'center', marginTop: '1.5rem', marginBottom: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    <Link to="/login" style={{ color: 'var(--text-muted)' }}>
                        ← Volver a iniciar sesión
                    </Link>
                </p>
            }
        >
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

                    <Button type="submit" fullWidth loading={loading} style={{ marginTop: '0.5rem', padding: '0.95rem' }}>
                        {loading ? 'Enviando…' : 'Enviar enlace'}
                    </Button>
                </form>
            )}
        </AuthLayout>
    );
};

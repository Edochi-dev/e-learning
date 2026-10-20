import { useState } from 'react';
import { useNavigate, useLocation, Link, type Location } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '@maris-nails/shared';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/Button';

export const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();
    // Lo pone ProtectedRoute; viene del router, no de la URL, así que no sirve para redirigir fuera del sitio.
    const from = (useLocation().state as { from?: Location } | null)?.from;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const user = await login({ email, password });
            if (from) {
                navigate(`${from.pathname}${from.search}`, { replace: true });
            } else {
                navigate(user.role === UserRole.ADMIN ? '/admin' : '/mis-cursos');
            }
        } catch {
            setError('Credenciales inválidas. Por favor intenta de nuevo.');
        }
    };

    return (
        <AuthLayout
            icon={LogIn}
            title="Iniciar Sesión"
            subtitle="Entra para acceder a tus cursos"
            footer={
                <>
                    <p style={{ textAlign: 'center', marginTop: '1.5rem', marginBottom: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        ¿No tienes cuenta?{' '}
                        <Link to="/registro" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                            Regístrate
                        </Link>
                    </p>
                    <p style={{ textAlign: 'center', marginTop: '0.5rem', marginBottom: 0, fontSize: '0.875rem' }}>
                        <Link to="/recuperar" style={{ color: 'var(--text-muted)' }}>
                            ¿Olvidaste tu contraseña?
                        </Link>
                    </p>
                    <p style={{ textAlign: 'center', marginTop: '0.75rem', marginBottom: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        <Link to="/" style={{ color: 'var(--text-muted)' }}>
                            ← Volver al inicio
                        </Link>
                    </p>
                </>
            }
        >
            {error && (
                <div style={{
                    background: 'var(--danger-soft)',
                    color: 'var(--danger)',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '1.25rem',
                    fontSize: '0.85rem',
                    border: '1px solid var(--danger-soft)',
                    fontWeight: 500,
                }}>
                    ⚠️ {error}
                </div>
            )}

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

                <div>
                    <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem' }}>
                        Contraseña
                    </label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                    />
                </div>

                <Button type="submit" fullWidth style={{ marginTop: '0.5rem', padding: '0.95rem' }}>
                    Ingresar
                </Button>
            </form>
        </AuthLayout>
    );
};

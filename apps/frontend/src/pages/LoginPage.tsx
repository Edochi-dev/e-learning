import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '@maris-nails/shared';

export const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            await login({ email, password });

            // Verificar si hay token para redirección basada en roles
            const token = localStorage.getItem('access_token');
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    if (payload.role === UserRole.ADMIN) {
                        navigate('/admin');
                        return;
                    }
                } catch (e) {
                    console.error('Error parsing token for redirect', e);
                }
            }
            navigate('/');
        } catch (err: any) {
            setError('Credenciales inválidas. Por favor intenta de nuevo.');
        }
    };

    return (
        <div className="container" style={{ maxWidth: '520px', marginTop: '5rem', marginBottom: '3rem' }}>
            <div className="card">
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <span style={{ fontSize: '3rem' }}>💅</span>
                    <h2 style={{
                        marginTop: '0.75rem',
                        marginBottom: '0.25rem',
                        fontSize: '1.8rem',
                        background: 'linear-gradient(135deg, var(--primary), var(--gold))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>
                        Iniciar Sesión
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        Accede a tus cursos y clases
                    </p>
                </div>

                {error && (
                    <div style={{
                        background: 'linear-gradient(135deg, #fff0f0, #ffe8e8)',
                        color: '#c0392b',
                        padding: '0.85rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: '1.25rem',
                        fontSize: '0.85rem',
                        border: '1px solid rgba(192, 57, 43, 0.12)',
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

                    <button
                        type="submit"
                        className="btn-primary"
                        style={{ marginTop: '0.5rem', width: '100%', padding: '0.95rem' }}
                    >
                        Ingresar
                    </button>
                </form>

                <p style={{
                    textAlign: 'center',
                    marginTop: '1.5rem',
                    marginBottom: 0,
                    fontSize: '0.875rem',
                    color: 'var(--text-muted)',
                }}>
                    ¿No tienes cuenta?{' '}
                    <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                        Regístrate aquí
                    </Link>
                </p>
            </div>
        </div>
    );
};

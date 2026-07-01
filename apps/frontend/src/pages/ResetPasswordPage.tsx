import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

/**
 * ResetPasswordPage — Paso 2 del reset: el alumno elige su nueva contraseña.
 *
 * El token viaja en la query del enlace (?token=...). Se valida en el backend;
 * si es inválido o expiró, mostramos el error que devuelve.
 */
export const ResetPasswordPage = () => {
    const { resetPassword } = useAuth();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') ?? '';
    const navigate = useNavigate();
    const toast = useToast();

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const passwordValid = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/.test(password);
    const passwordsMatch = password === confirm;
    const canSubmit = !!token && passwordValid && passwordsMatch && !loading;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;
        setLoading(true);
        setError('');
        try {
            await resetPassword(token, password);
            toast.success('Contraseña actualizada. Ya puedes iniciar sesión.');
            navigate('/login');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo restablecer la contraseña.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ maxWidth: '520px', marginTop: '5rem', marginBottom: '3rem' }}>
            <div className="card">
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <span style={{ fontSize: '3rem' }}>🔒</span>
                    <h2 style={{
                        marginTop: '0.75rem',
                        marginBottom: '0.25rem',
                        fontSize: '1.8rem',
                        background: 'linear-gradient(135deg, var(--primary), var(--gold))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>
                        Nueva contraseña
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        Elige una contraseña nueva para tu cuenta
                    </p>
                </div>

                {!token ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        <p>El enlace no es válido. Solicita uno nuevo.</p>
                        <Link to="/recuperar" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                            Recuperar contraseña
                        </Link>
                    </div>
                ) : (
                    <>
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
                                <label htmlFor="new-password" style={{ display: 'block', marginBottom: '0.5rem' }}>
                                    Nueva contraseña
                                </label>
                                <input
                                    id="new-password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="new-password"
                                    placeholder="••••••••"
                                />
                                {password && !passwordValid && (
                                    <p style={{ fontSize: '0.8rem', color: '#c0392b', marginTop: '0.4rem' }}>
                                        Mínimo 8 caracteres, con letras y números.
                                    </p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="confirm-password" style={{ display: 'block', marginBottom: '0.5rem' }}>
                                    Confirmar contraseña
                                </label>
                                <input
                                    id="confirm-password"
                                    type="password"
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    autoComplete="new-password"
                                    placeholder="••••••••"
                                />
                                {confirm && !passwordsMatch && (
                                    <p style={{ fontSize: '0.8rem', color: '#c0392b', marginTop: '0.4rem' }}>
                                        Las contraseñas no coinciden.
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={!canSubmit}
                                style={{ marginTop: '0.5rem', width: '100%', padding: '0.95rem' }}
                            >
                                {loading ? 'Guardando…' : 'Cambiar contraseña'}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

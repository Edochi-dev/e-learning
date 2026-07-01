import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/Button';

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
        <AuthLayout
            icon={Lock}
            title="Nueva contraseña"
            subtitle="Elige una contraseña nueva para tu cuenta"
        >
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

                        <Button type="submit" fullWidth disabled={!canSubmit} loading={loading} style={{ marginTop: '0.5rem', padding: '0.95rem' }}>
                            {loading ? 'Guardando…' : 'Cambiar contraseña'}
                        </Button>
                    </form>
                </>
            )}
        </AuthLayout>
    );
};

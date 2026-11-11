import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, ScrollText, Sparkles, TriangleAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from '../components/AuthLayout';
import { inlineIconStyle } from '../components/inlineIcon';

export const RegisterPage = () => {
    const { register } = useAuth();
    const navigate = useNavigate();

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Error específico del campo email (cuando el correo ya está registrado)
    const [emailError, setEmailError] = useState('');
    // Error de contraseñas que no coinciden (validación client-side)
    const [passwordError, setPasswordError] = useState('');
    // Error genérico para cualquier otro fallo
    const [error, setError] = useState('');

    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Limpiar errores previos antes de cada intento
        setEmailError('');
        setPasswordError('');
        setError('');

        // Validación client-side 1: formato de contraseña.
        // La misma regex que usa el backend: 8+ caracteres, al menos 1 letra y 1 número.
        // Verificamos aquí para dar feedback inmediato sin hacer un viaje de red.
        const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;
        if (!PASSWORD_REGEX.test(password)) {
            setPasswordError('La contraseña debe tener al menos 8 caracteres, incluyendo letras y números.');
            return;
        }

        // Validación client-side 2: las contraseñas deben coincidir.
        if (password !== confirmPassword) {
            setPasswordError('Las contraseñas no coinciden. Verifica e intenta de nuevo.');
            return;
        }

        setIsLoading(true);

        try {
            // Solo enviamos { fullName, email, password }.
            // confirmPassword es un campo de UI — nunca sale del componente.
            await register({ fullName, email, password });
            navigate('/mis-cursos');
        } catch (err: any) {
            const message: string = err.message || '';

            // El backend lanza ConflictException con "already exists" cuando el email está tomado.
            // Detectamos esa condición para mostrar el error bajo el campo de email,
            // no como un error genérico rojo.
            if (message.toLowerCase().includes('already exists') || message.toLowerCase().includes('conflict')) {
                setEmailError('Este correo ya tiene una cuenta registrada. ¿Quieres iniciar sesión?');
            } else {
                setError(message || 'Ocurrió un error al crear tu cuenta. Intenta de nuevo.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthLayout title={<>Crear <em>cuenta</em></>} subtitle="Únete a nuestra academia de nail art">
                {/* Error genérico (todo lo que no sea email duplicado) */}
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
                        <TriangleAlert size={16} strokeWidth={1.75} aria-hidden="true" style={inlineIconStyle} />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                    {/* Campo: Nombre completo */}
                    <div>
                        <label htmlFor="fullName" style={{ display: 'block', marginBottom: '0.5rem' }}>
                            Nombre completo
                        </label>
                        <input
                            id="fullName"
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                            placeholder="Ej: María González"
                        />
                        {/* Advertencia del certificado — siempre visible */}
                        <div className="certificate-notice">
                            <ScrollText size={14} strokeWidth={1.75} aria-hidden="true" style={inlineIconStyle} />
                            Este nombre aparecerá en tu certificado de aprobación. Escríbelo con cuidado, teniendo en cuenta las mayúsculas y tildes correctas.
                        </div>

                        {/* Previsualización del certificado — se muestra desde la primera letra
                            y se actualiza en tiempo real con cada tecla.
                            fullName.trim() es falsy cuando está vacío, truthy en cuanto hay texto. */}
                        {fullName.trim() && (
                            <div className="certificate-preview">
                                <p className="certificate-preview__label"><Sparkles size={12} strokeWidth={1.75} aria-hidden="true" style={inlineIconStyle} />Vista previa de tu certificado</p>
                                <hr className="certificate-preview__divider" />
                                <p className="certificate-preview__granted">
                                    Este certificado de aprobación se otorga a:
                                </p>
                                <p className="certificate-preview__name">{fullName}</p>
                                <p className="certificate-preview__footer">Mari's Nails Academy</p>
                            </div>
                        )}
                    </div>

                    {/* Campo: Email */}
                    <div>
                        <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem' }}>
                            Correo electrónico
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                // Al escribir de nuevo, limpiamos el error de email duplicado
                                if (emailError) setEmailError('');
                            }}
                            required
                            placeholder="tu@email.com"
                        />
                        {/* Mensajito suave cuando el email ya está registrado */}
                        {emailError && (
                            <div className="email-taken-notice">
                                <Mail size={14} strokeWidth={1.75} aria-hidden="true" style={inlineIconStyle} />
                                {emailError}{' '}
                                <Link to="/login" style={{ color: 'inherit', fontWeight: 600 }}>
                                    Ir al login →
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Campo: Contraseña */}
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
                            placeholder="Mínimo 8 caracteres"
                            aria-describedby="password-hint"
                        />
                        <p id="password-hint" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.4rem 0 0' }}>
                            Con letras y números.
                        </p>
                    </div>

                    {/* Campo: Confirmar contraseña — solo validación visual, nunca se envía */}
                    <div>
                        <label htmlFor="confirmPassword" style={{ display: 'block', marginBottom: '0.5rem' }}>
                            Confirmar contraseña
                        </label>
                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                if (passwordError) setPasswordError('');
                            }}
                            required
                            placeholder="Repite tu contraseña"
                        />
                        {/* Error inline si las contraseñas no coinciden */}
                        {passwordError && (
                            <p style={{
                                fontSize: '0.8rem',
                                color: 'var(--danger)',
                                marginTop: '0.35rem',
                                marginBottom: 0,
                            }}>
                                <TriangleAlert size={14} strokeWidth={1.75} aria-hidden="true" style={inlineIconStyle} />
                                {passwordError}
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={isLoading}
                        style={{ marginTop: '0.5rem', width: '100%', padding: '0.95rem' }}
                    >
                        {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
                    </button>
                </form>

                {/* Footer del card */}
                <p style={{
                    textAlign: 'center',
                    marginTop: '1.5rem',
                    marginBottom: 0,
                    fontSize: '0.875rem',
                    color: 'var(--text-muted)',
                }}>
                    ¿Ya tienes cuenta?{' '}
                    <Link to="/login" style={{ color: 'var(--accent-text)', fontWeight: 600 }}>
                        Iniciar sesión
                    </Link>
                </p>
        </AuthLayout>
    );
};

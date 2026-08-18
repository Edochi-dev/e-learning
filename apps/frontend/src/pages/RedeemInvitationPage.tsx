import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { InvitationPreview } from '@maris-nails/shared';
import { InvitationStatus } from '@maris-nails/shared';
import type { StudentInvitationGateway } from '../gateways/InvitationGateway';
import type { AuthGateway } from '../gateways/AuthGateway';
import { API_URL as BACKEND_URL } from '../config';

interface RedeemInvitationPageProps {
    gateway: StudentInvitationGateway;
    authGateway: AuthGateway;
}

/** Qué decirle a la alumna según por qué su enlace no sirve. */
const UNUSABLE_MESSAGES: Record<string, { title: string; detail: string }> = {
    [InvitationStatus.REDEEMED]: {
        title: 'Esta invitación ya se usó',
        detail: 'Si fuiste tú, inicia sesión con tu cuenta y encontrarás el curso en "Mis Cursos".',
    },
    [InvitationStatus.EXPIRED]: {
        title: 'Esta invitación caducó',
        detail: 'Escríbele a tu profesora por WhatsApp y te enviará un enlace nuevo.',
    },
    [InvitationStatus.REVOKED]: {
        title: 'Esta invitación fue anulada',
        detail: 'Escríbele a tu profesora por WhatsApp para que te envíe otra.',
    },
};

/**
 * RedeemInvitationPage — La alumna abre su enlace y entra al curso.
 *
 * Va FUERA del ComingSoonGuard, como /login y /registro: quien recibe una
 * invitación tiene que poder entrar aunque el sitio siga en modo próximamente.
 *
 * Los tres motivos por los que un enlace puede no servir se distinguen con un
 * mensaje propio. Un "enlace inválido" genérico dejaría a la alumna sin saber
 * si se equivocó, si llegó tarde o si ya lo había usado.
 */
export const RedeemInvitationPage = ({
    gateway,
    authGateway,
}: RedeemInvitationPageProps) => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();

    const [preview, setPreview] = useState<InvitationPreview | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    /** Nombre de la sesión activa, si la hay. null = visitante sin cuenta. */
    const [sessionName, setSessionName] = useState<string | null>(null);

    const [form, setForm] = useState({ fullName: '', email: '', password: '' });
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    useEffect(() => {
        if (!token) return;

        let cancelled = false;
        setLoading(true);

        gateway
            .getPreview(token)
            .then((data) => {
                if (!cancelled) setPreview(data);
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    setLoadError(
                        err instanceof Error ? err.message : 'Invitación no encontrada',
                    );
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [gateway, token]);

    // getMe() devuelve null sin lanzar cuando no hay sesión, así que un
    // visitante anónimo simplemente ve el formulario de alta.
    useEffect(() => {
        let cancelled = false;

        authGateway
            .getMe()
            .then((user) => {
                if (!cancelled && user) setSessionName(user.fullName);
            })
            .catch(() => {
                /* Sin sesión: el formulario de alta es el camino correcto. */
            });

        return () => {
            cancelled = true;
        };
    }, [authGateway]);

    const handleClaim = async () => {
        if (!token) return;

        setSubmitting(true);
        setSubmitError(null);

        try {
            await gateway.claim(token);
            navigate('/mis-cursos');
        } catch (err) {
            setSubmitError(
                err instanceof Error ? err.message : 'No pudimos activar tu invitación',
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        setSubmitting(true);
        setSubmitError(null);

        try {
            await gateway.redeem(token, form);
            // A /mis-cursos y NUNCA a la home: con el sitio en modo próximamente,
            // la home le mostraría la pantalla de "próximamente" justo después
            // de activar su acceso.
            navigate('/mis-cursos');
        } catch (err) {
            setSubmitError(
                err instanceof Error ? err.message : 'No pudimos activar tu invitación',
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="container invitation-page">
                <div className="spinner" />
            </div>
        );
    }

    if (loadError || !preview) {
        return (
            <div className="container invitation-page">
                <div className="invitation-card invitation-card--error">
                    <h1>Invitación no encontrada</h1>
                    <p>{loadError ?? 'Revisa que el enlace esté completo.'}</p>
                    <p className="invitation-card__hint">
                        Los enlaces son largos: si lo copiaste a mano, puede que falte
                        un trozo. Pídele a tu profesora que te lo reenvíe.
                    </p>
                </div>
            </div>
        );
    }

    if (preview.status !== InvitationStatus.VALID) {
        const message = UNUSABLE_MESSAGES[preview.status];
        return (
            <div className="container invitation-page">
                <div className="invitation-card invitation-card--error">
                    <h1>{message.title}</h1>
                    <p>{message.detail}</p>
                    <Link to="/login" className="btn-primary">
                        Iniciar sesión
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container invitation-page">
            <div className="invitation-card">
                <p className="invitation-card__eyebrow">Tu invitación a</p>
                <h1 className="invitation-card__course">{preview.course.title}</h1>

                {preview.course.thumbnailUrl && (
                    <img
                        src={`${BACKEND_URL}${preview.course.thumbnailUrl}`}
                        alt={preview.course.title}
                        className="invitation-card__thumb"
                    />
                )}

                <p className="invitation-card__desc">{preview.course.description}</p>

                <p className="invitation-card__access">
                    {preview.accessDurationDays === null
                        ? 'Acceso permanente'
                        : `${preview.accessDurationDays} días de acceso desde que actives`}
                </p>

                {sessionName ? (
                    <div className="invitation-form">
                        <p className="invitation-card__desc">
                            Estás dentro como <strong>{sessionName}</strong>. Añadimos
                            este curso a tu cuenta, sin crear otra.
                        </p>

                        {submitError && (
                            <p className="invitation-form__error">{submitError}</p>
                        )}

                        <button
                            type="button"
                            className="btn-primary"
                            disabled={submitting}
                            onClick={() => void handleClaim()}
                            style={{ width: '100%' }}
                        >
                            {submitting ? 'Activando...' : 'Añadir a mi cuenta'}
                        </button>
                    </div>
                ) : (
                <form onSubmit={handleSubmit} className="invitation-form">
                    <div className="form-group">
                        <label htmlFor="fullName">Tu nombre completo</label>
                        <input
                            id="fullName"
                            name="fullName"
                            type="text"
                            required
                            value={form.fullName}
                            onChange={(e) =>
                                setForm({ ...form, fullName: e.target.value })
                            }
                            placeholder="Como quieres que aparezca en tu certificado"
                        />
                        <small className="form-hint">
                            Este nombre saldrá impreso en tus certificados.
                        </small>
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">Tu correo</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Crea tu contraseña</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            value={form.password}
                            onChange={(e) =>
                                setForm({ ...form, password: e.target.value })
                            }
                        />
                        <small className="form-hint">
                            Mínimo 8 caracteres, con letras y números.
                        </small>
                    </div>

                    {submitError && (
                        <p className="invitation-form__error">{submitError}</p>
                    )}

                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={submitting}
                        style={{ width: '100%' }}
                    >
                        {submitting ? 'Activando...' : 'Activar mi acceso'}
                    </button>
                </form>
                )}

                {!sessionName && (
                    <p className="invitation-card__hint">
                        ¿Ya tienes cuenta?{' '}
                        <Link to="/login">Inicia sesión</Link> y vuelve a abrir este
                        enlace para añadir el curso a tu cuenta.
                    </p>
                )}
            </div>
        </div>
    );
};

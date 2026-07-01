import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserAvatar, getColorFromName } from '../components/UserAvatar';
import { useToast } from '../components/Toast';
import type { AuthGateway } from '../gateways/AuthGateway';
import type { OrderGateway, MyOrder } from '../gateways/OrderGateway';
import type { CertificateGateway, Certificate } from '../gateways/CertificateGateway';
import type { StudentNameChangeGateway } from '../gateways/NameChangeGateway';
import { OrderStatus, NameChangeRequestStatus, type NameChangeRequest } from '@maris-nails/shared';

interface Props {
    gateway: AuthGateway;
    orderGateway: OrderGateway;
    certificateGateway: CertificateGateway;
    nameChangeGateway: StudentNameChangeGateway;
}

type Tab = 'cuenta' | 'certificados' | 'facturacion';

/**
 * AccountPage — Página "Mi Cuenta" con 2 tabs.
 *
 * Tab "Mi Cuenta":
 *   - Información personal (nombre, email) — solo lectura por ahora.
 *   - Formulario para cambiar contraseña (funcional).
 *
 * Tab "Facturación":
 *   - Tarjetas guardadas y historial de pagos — placeholders para futuro.
 *
 * Recibe el AuthGateway como prop (patrón del frontend: pages reciben
 * gateways como props, nunca los importan directamente).
 */
export const AccountPage: React.FC<Props> = ({ gateway, orderGateway, certificateGateway, nameChangeGateway }) => {
    const { user } = useAuth();

    // ── Tab activa ──────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<Tab>('cuenta');

    // ── Cambio de contraseña ────────────────────────────────────────────
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);
    const toast = useToast();

    // ── Solicitud de cambio de nombre ───────────────────────────────────
    // El alumno NO cambia su nombre libremente: lo solicita y un admin lo
    // aprueba (evita emitir certificados con varios nombres).
    const [nameRequest, setNameRequest] = useState<NameChangeRequest | null>(null);
    const [showNameForm, setShowNameForm] = useState(false);
    const [requestedName, setRequestedName] = useState('');
    const [submittingNameReq, setSubmittingNameReq] = useState(false);

    useEffect(() => {
        nameChangeGateway.getMyRequest()
            .then(setNameRequest)
            .catch(() => setNameRequest(null));
    }, [nameChangeGateway]);

    // ── Historial de compras ────────────────────────────────────────────
    const [orders, setOrders] = useState<MyOrder[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(true);
    const [ordersError, setOrdersError] = useState(false);

    useEffect(() => {
        orderGateway.getMyOrders()
            .then(setOrders)
            .catch(() => setOrdersError(true))
            .finally(() => setOrdersLoading(false));
    }, [orderGateway]);

    // ── Mis certificados ────────────────────────────────────────────────
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [certsLoading, setCertsLoading] = useState(true);
    const [certsError, setCertsError] = useState(false);

    useEffect(() => {
        certificateGateway.getMyCertificates()
            .then(setCertificates)
            .catch(() => setCertsError(true))
            .finally(() => setCertsLoading(false));
    }, [certificateGateway]);

    if (!user) return null;

    const avatarColor = getColorFromName(user.fullName);

    const passwordsMatch = newPassword === confirmPassword;
    const passwordValid = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/.test(newPassword);
    const canSubmitPassword = currentPassword && newPassword && confirmPassword
        && passwordsMatch && passwordValid && !changingPassword;

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmitPassword) return;

        setChangingPassword(true);

        try {
            await gateway.changePassword(currentPassword, newPassword);
            toast.success('Contraseña actualizada correctamente.');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Error al cambiar la contraseña');
        } finally {
            setChangingPassword(false);
        }
    };

    // Cooldown de 30 días entre solicitudes (el backend también lo valida).
    const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
    const cooldownUntil = nameRequest
        ? new Date(new Date(nameRequest.createdAt).getTime() + COOLDOWN_MS)
        : null;
    const inCooldown = cooldownUntil ? Date.now() < cooldownUntil.getTime() : false;
    const hasPendingNameReq = nameRequest?.status === NameChangeRequestStatus.PENDING;
    const canRequestName = !hasPendingNameReq && !inCooldown;

    const handleRequestName = async () => {
        const trimmed = requestedName.trim();
        if (!trimmed || trimmed === user.fullName) {
            toast.error('Escribe un nombre distinto al actual.');
            return;
        }
        setSubmittingNameReq(true);
        try {
            const created = await nameChangeGateway.requestNameChange(trimmed);
            setNameRequest(created);
            setShowNameForm(false);
            setRequestedName('');
            toast.success('Solicitud enviada. Un administrador la revisará.');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'No se pudo enviar la solicitud');
        } finally {
            setSubmittingNameReq(false);
        }
    };

    // Etiqueta y color del estado de una orden.
    const statusLabel = (s: OrderStatus) =>
        s === OrderStatus.COMPLETED ? 'Pagada' : s === OrderStatus.PENDING ? 'Pendiente' : 'Fallida';
    const statusColor = (s: OrderStatus) =>
        s === OrderStatus.COMPLETED ? '#1a7f5a' : s === OrderStatus.PENDING ? '#a86b00' : '#c0392b';

    // Descarga el PDF del certificado (el gateway resuelve la URL del archivo).
    const downloadCertificate = async (cert: Certificate) => {
        try {
            const blob = await certificateGateway.downloadCertificatePdf(cert.filePath);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${cert.certificateNumber}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error('No se pudo descargar el certificado.');
        }
    };

    return (
        <div className="account-page">
            {/* ── Banner dinámico con degradado derivado del nombre ── */}
            <div
                className="account-banner"
                style={{
                    background: `linear-gradient(135deg, ${avatarColor}33 0%, ${avatarColor}11 50%, var(--bg) 100%)`,
                    borderBottom: `1px solid ${avatarColor}33`,
                }}
            >
                <div className="account-banner__avatar">
                    <UserAvatar name={user.fullName} size="lg" />
                </div>
            </div>

            {/* ── Contenido ── */}
            <div className="container account-content">
                <div className="account-profile">
                    <h1 className="account-profile__name">{user.fullName}</h1>
                    <span className="account-profile__role">
                        {user.role === 'admin' ? '🛡️ Administradora' : '🎓 Estudiante'}
                    </span>
                </div>

                {/* ── Tabs ── */}
                <div className="account-tabs">
                    <button
                        className={`account-tabs__btn ${activeTab === 'cuenta' ? 'account-tabs__btn--active' : ''}`}
                        onClick={() => setActiveTab('cuenta')}
                    >
                        Mi Cuenta
                    </button>
                    <button
                        className={`account-tabs__btn ${activeTab === 'certificados' ? 'account-tabs__btn--active' : ''}`}
                        onClick={() => setActiveTab('certificados')}
                    >
                        Certificados
                    </button>
                    <button
                        className={`account-tabs__btn ${activeTab === 'facturacion' ? 'account-tabs__btn--active' : ''}`}
                        onClick={() => setActiveTab('facturacion')}
                    >
                        Facturación
                    </button>
                </div>

                {/* ── Tab: Mi Cuenta ── */}
                {activeTab === 'cuenta' && (
                    <div className="account-tab-content">
                        {/* Info personal */}
                        <section className="account-card">
                            <h2 className="account-card__title">Información Personal</h2>

                            <div className="account-field">
                                <label className="account-field__label">Nombre completo</label>
                                <p className="account-field__value" style={{ margin: 0 }}>{user.fullName}</p>

                                {/* Estado de la última solicitud */}
                                {hasPendingNameReq && (
                                    <p className="account-field__hint" style={{ marginTop: '0.4rem' }}>
                                        Solicitud pendiente: “{nameRequest?.requestedName}” — en revisión por un administrador.
                                    </p>
                                )}
                                {nameRequest?.status === NameChangeRequestStatus.REJECTED && (
                                    <p className="account-field__hint account-field__hint--error" style={{ marginTop: '0.4rem' }}>
                                        Tu última solicitud (“{nameRequest.requestedName}”) fue rechazada
                                        {nameRequest.feedback ? `: ${nameRequest.feedback}` : '.'}
                                    </p>
                                )}

                                {/* Botón / formulario de solicitud */}
                                {!showNameForm ? (
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={() => { setRequestedName(user.fullName); setShowNameForm(true); }}
                                        disabled={!canRequestName}
                                        style={{ marginTop: '0.6rem', padding: '0.35rem 0.9rem', fontSize: '0.8rem' }}
                                    >
                                        Solicitar cambio de nombre
                                    </button>
                                ) : (
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.6rem' }}>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={requestedName}
                                            onChange={e => setRequestedName(e.target.value)}
                                            maxLength={100}
                                            placeholder="Nombre deseado"
                                            style={{ flex: 1, minWidth: '12rem' }}
                                        />
                                        <button type="button" className="btn-primary" onClick={handleRequestName} disabled={submittingNameReq}>
                                            {submittingNameReq ? 'Enviando…' : 'Enviar solicitud'}
                                        </button>
                                        <button type="button" className="btn-secondary" onClick={() => { setShowNameForm(false); setRequestedName(''); }} disabled={submittingNameReq}>
                                            Cancelar
                                        </button>
                                    </div>
                                )}

                                {/* Cooldown: cuándo podrá volver a solicitar */}
                                {!hasPendingNameReq && inCooldown && cooldownUntil && (
                                    <p className="account-field__hint" style={{ marginTop: '0.4rem' }}>
                                        Podrás solicitar otro cambio a partir del {cooldownUntil.toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' })}.
                                    </p>
                                )}

                                {/* Letra chica: por qué el cambio no es libre */}
                                <p className="account-field__hint" style={{ marginTop: '0.5rem', fontSize: '0.72rem', lineHeight: 1.5 }}>
                                    Por seguridad, tu nombre no se cambia libremente: aparece en tus certificados,
                                    y permitirlo facilitaría emitir certificados con varios nombres. El cambio se hace
                                    por solicitud y un administrador la revisa (máximo una cada 30 días). Al aprobarse,
                                    tu nombre y tus iniciales se actualizan automáticamente.
                                </p>
                            </div>

                            <div className="account-field">
                                <label className="account-field__label">Correo electrónico</label>
                                <p className="account-field__value">{user.email}</p>
                            </div>
                        </section>

                        {/* Cambiar contraseña */}
                        <section className="account-card">
                            <h2 className="account-card__title">Cambiar Contraseña</h2>

                            <form onSubmit={handleChangePassword} className="account-password-form">
                                <div className="account-field">
                                    <label className="account-field__label" htmlFor="current-pw">Contraseña actual</label>
                                    <input
                                        id="current-pw"
                                        type="password"
                                        className="form-input"
                                        value={currentPassword}
                                        onChange={e => setCurrentPassword(e.target.value)}
                                        autoComplete="current-password"
                                    />
                                </div>

                                <div className="account-field">
                                    <label className="account-field__label" htmlFor="new-pw">Nueva contraseña</label>
                                    <input
                                        id="new-pw"
                                        type="password"
                                        className="form-input"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        autoComplete="new-password"
                                    />
                                    {newPassword && !passwordValid && (
                                        <p className="account-field__hint account-field__hint--error">
                                            Mínimo 8 caracteres, con letras y números.
                                        </p>
                                    )}
                                </div>

                                <div className="account-field">
                                    <label className="account-field__label" htmlFor="confirm-pw">Confirmar nueva contraseña</label>
                                    <input
                                        id="confirm-pw"
                                        type="password"
                                        className="form-input"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        autoComplete="new-password"
                                    />
                                    {confirmPassword && !passwordsMatch && (
                                        <p className="account-field__hint account-field__hint--error">
                                            Las contraseñas no coinciden.
                                        </p>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={!canSubmitPassword}
                                >
                                    {changingPassword ? 'Cambiando…' : 'Cambiar contraseña'}
                                </button>
                            </form>
                        </section>
                    </div>
                )}

                {/* ── Tab: Certificados ── */}
                {activeTab === 'certificados' && (
                    <div className="account-tab-content">
                        <section className="account-card">
                            <h2 className="account-card__title">Mis Certificados</h2>

                            {certsLoading && (
                                <div className="account-card__empty"><p>Cargando…</p></div>
                            )}

                            {!certsLoading && certsError && (
                                <div className="account-card__empty">
                                    <p>No se pudieron cargar tus certificados.</p>
                                </div>
                            )}

                            {!certsLoading && !certsError && certificates.length === 0 && (
                                <div className="account-card__empty">
                                    <p>🎓</p>
                                    <p>Aún no tienes certificados.</p>
                                </div>
                            )}

                            {!certsLoading && !certsError && certificates.length > 0 && (
                                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {certificates.map(cert => (
                                        <li
                                            key={cert.id}
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                gap: '1rem',
                                                padding: '0.9rem 1rem',
                                                border: '1px solid var(--border)',
                                                borderRadius: 'var(--radius-md)',
                                                flexWrap: 'wrap',
                                            }}
                                        >
                                            <div>
                                                <p style={{ margin: 0, fontWeight: 600 }}>
                                                    {cert.templateSnapshot?.name ?? 'Certificado'}
                                                </p>
                                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                    {cert.certificateNumber} · {new Date(cert.issuedAt).toLocaleDateString('es', {
                                                        day: '2-digit', month: 'long', year: 'numeric',
                                                    })}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                className="btn-secondary"
                                                onClick={() => downloadCertificate(cert)}
                                                style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                                            >
                                                Descargar PDF
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    </div>
                )}

                {/* ── Tab: Facturación ── */}
                {activeTab === 'facturacion' && (
                    <div className="account-tab-content">
                        <section className="account-card">
                            <h2 className="account-card__title">Métodos de Pago</h2>
                            <div className="account-card__empty">
                                <p>💳</p>
                                <p>No tienes tarjetas guardadas.</p>
                            </div>
                        </section>

                        <section className="account-card">
                            <h2 className="account-card__title">Historial de Pagos</h2>

                            {ordersLoading && (
                                <div className="account-card__empty"><p>Cargando…</p></div>
                            )}

                            {!ordersLoading && ordersError && (
                                <div className="account-card__empty">
                                    <p>No se pudo cargar tu historial de compras.</p>
                                </div>
                            )}

                            {!ordersLoading && !ordersError && orders.length === 0 && (
                                <div className="account-card__empty">
                                    <p>🧾</p>
                                    <p>Aún no tienes compras.</p>
                                </div>
                            )}

                            {!ordersLoading && !ordersError && orders.length > 0 && (
                                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {orders.map(order => (
                                        <li
                                            key={order.id}
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                gap: '1rem',
                                                padding: '0.9rem 1rem',
                                                border: '1px solid var(--border)',
                                                borderRadius: 'var(--radius-md)',
                                                flexWrap: 'wrap',
                                            }}
                                        >
                                            <div>
                                                <p style={{ margin: 0, fontWeight: 600 }}>
                                                    {order.course?.title ?? 'Curso'}
                                                </p>
                                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                    {new Date(order.createdAt).toLocaleDateString('es', {
                                                        day: '2-digit', month: 'long', year: 'numeric',
                                                    })}
                                                </p>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <span style={{ fontWeight: 700 }}>
                                                    ${Number(order.amount).toFixed(2)}
                                                </span>
                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    fontWeight: 700,
                                                    color: statusColor(order.status),
                                                    border: `1px solid ${statusColor(order.status)}`,
                                                    borderRadius: 'var(--radius-full)',
                                                    padding: '0.2rem 0.7rem',
                                                    whiteSpace: 'nowrap',
                                                }}>
                                                    {statusLabel(order.status)}
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
};

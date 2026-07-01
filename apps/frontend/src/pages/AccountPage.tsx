import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserAvatar, getColorFromName } from '../components/UserAvatar';
import { useToast } from '../components/Toast';
import type { AuthGateway } from '../gateways/AuthGateway';
import type { OrderGateway, MyOrder } from '../gateways/OrderGateway';
import type { CertificateGateway, Certificate } from '../gateways/CertificateGateway';
import { OrderStatus } from '@maris-nails/shared';

interface Props {
    gateway: AuthGateway;
    orderGateway: OrderGateway;
    certificateGateway: CertificateGateway;
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
export const AccountPage: React.FC<Props> = ({ gateway, orderGateway, certificateGateway }) => {
    const { user, updateProfile } = useAuth();

    // ── Tab activa ──────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<Tab>('cuenta');

    // ── Cambio de contraseña ────────────────────────────────────────────
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);
    const toast = useToast();

    // ── Edición de nombre ───────────────────────────────────────────────
    const [editingName, setEditingName] = useState(false);
    const [nameValue, setNameValue] = useState('');
    const [savingName, setSavingName] = useState(false);

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

    const startEditName = () => {
        setNameValue(user.fullName);
        setEditingName(true);
    };

    const handleSaveName = async () => {
        const trimmed = nameValue.trim();
        if (!trimmed || trimmed === user.fullName) {
            setEditingName(false);
            return;
        }
        setSavingName(true);
        try {
            await updateProfile(trimmed);
            toast.success('Nombre actualizado.');
            setEditingName(false);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Error al actualizar el nombre');
        } finally {
            setSavingName(false);
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
                                {editingName ? (
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={nameValue}
                                            onChange={e => setNameValue(e.target.value)}
                                            maxLength={100}
                                            style={{ flex: 1, minWidth: '12rem' }}
                                        />
                                        <button type="button" className="btn-primary" onClick={handleSaveName} disabled={savingName}>
                                            {savingName ? 'Guardando…' : 'Guardar'}
                                        </button>
                                        <button type="button" className="btn-secondary" onClick={() => setEditingName(false)} disabled={savingName}>
                                            Cancelar
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                        <p className="account-field__value" style={{ margin: 0 }}>{user.fullName}</p>
                                        <button
                                            type="button"
                                            className="btn-secondary"
                                            onClick={startEditName}
                                            style={{ padding: '0.35rem 0.9rem', fontSize: '0.8rem' }}
                                        >
                                            Editar
                                        </button>
                                    </div>
                                )}
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

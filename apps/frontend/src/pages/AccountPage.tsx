import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserAvatar, getColorFromName } from '../components/UserAvatar';
import type { AuthGateway } from '../gateways/AuthGateway';

interface Props {
    gateway: AuthGateway;
}

type Tab = 'cuenta' | 'facturacion';

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
export const AccountPage: React.FC<Props> = ({ gateway }) => {
    const { user } = useAuth();

    // ── Tab activa ──────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<Tab>('cuenta');

    // ── Cambio de contraseña ────────────────────────────────────────────
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [passwordSuccess, setPasswordSuccess] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);

    if (!user) return null;

    const avatarColor = getColorFromName(user.fullName);

    const passwordsMatch = newPassword === confirmPassword;
    const passwordValid = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/.test(newPassword);
    const canSubmitPassword = currentPassword && newPassword && confirmPassword
        && passwordsMatch && passwordValid && !changingPassword;

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmitPassword) return;

        setPasswordError(null);
        setPasswordSuccess(false);
        setChangingPassword(true);

        try {
            await gateway.changePassword(currentPassword, newPassword);
            setPasswordSuccess(true);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            setPasswordError(err instanceof Error ? err.message : 'Error al cambiar la contraseña');
        } finally {
            setChangingPassword(false);
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
                                <p className="account-field__value">{user.fullName}</p>
                            </div>

                            <div className="account-field">
                                <label className="account-field__label">Correo electrónico</label>
                                <p className="account-field__value">{user.email}</p>
                            </div>

                            <p className="account-card__note">
                                Para cambiar tu nombre, contacta a una administradora.
                            </p>
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
                                        onChange={e => { setNewPassword(e.target.value); setPasswordError(null); setPasswordSuccess(false); }}
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
                                        onChange={e => { setConfirmPassword(e.target.value); setPasswordError(null); setPasswordSuccess(false); }}
                                        autoComplete="new-password"
                                    />
                                    {confirmPassword && !passwordsMatch && (
                                        <p className="account-field__hint account-field__hint--error">
                                            Las contraseñas no coinciden.
                                        </p>
                                    )}
                                </div>

                                {passwordError && (
                                    <p className="account-field__hint account-field__hint--error">{passwordError}</p>
                                )}
                                {passwordSuccess && (
                                    <p className="account-field__hint account-field__hint--success">
                                        Contraseña actualizada correctamente.
                                    </p>
                                )}

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
                            <div className="account-card__empty">
                                <p>🧾</p>
                                <p>Tu historial de pagos aparecerá aquí.</p>
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
};

import { useAuth } from '../context/AuthContext';
import { UserAvatar, getColorFromName } from '../components/UserAvatar';

/**
 * AccountPage — Página de perfil del usuario.
 *
 * No recibe gateway porque solo muestra información que ya está
 * en el AuthContext (nombre, email, rol). No necesita llamar a la API.
 *
 * El banner dinámico:
 *   En vez de una imagen estática o un color fijo, generamos un degradado
 *   usando el mismo color que usa el avatar (derivado del nombre).
 *   Así el banner y el avatar siempre combinan y se ven personalizados.
 *
 * El color se calcula con getColorFromName(), la misma función de UserAvatar,
 * para garantizar consistencia visual en toda la app.
 */
export const AccountPage = () => {
    const { user } = useAuth();

    if (!user) return null;

    const avatarColor = getColorFromName(user.fullName);

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
                {/* El avatar grande queda a medio camino entre el banner y el contenido */}
                <div className="account-banner__avatar">
                    <UserAvatar name={user.fullName} size="lg" />
                </div>
            </div>

            {/* ── Contenido de la cuenta ── */}
            <div className="container account-content">
                {/* Nombre y rol */}
                <div className="account-profile">
                    <h1 className="account-profile__name">{user.fullName}</h1>
                    <span className="account-profile__role">
                        {user.role === 'admin' ? '🛡️ Administradora' : '🎓 Estudiante'}
                    </span>
                </div>

                {/* Tarjetas de información */}
                <div className="account-cards">
                    {/* Información personal */}
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

                        {/* Placeholder para futura funcionalidad de edición */}
                        <button className="btn-secondary account-card__action" disabled>
                            Editar perfil — próximamente
                        </button>
                    </section>

                    {/* Seguridad */}
                    <section className="account-card">
                        <h2 className="account-card__title">Seguridad</h2>

                        <div className="account-field">
                            <label className="account-field__label">Contraseña</label>
                            <p className="account-field__value">••••••••</p>
                        </div>

                        {/* Placeholder para futura funcionalidad */}
                        <button className="btn-secondary account-card__action" disabled>
                            Cambiar contraseña — próximamente
                        </button>
                    </section>

                    {/* Historial de pagos — placeholder */}
                    <section className="account-card">
                        <h2 className="account-card__title">Mis Pagos</h2>
                        <div className="account-card__empty">
                            <p>💳</p>
                            <p>El historial de pagos estará disponible próximamente.</p>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

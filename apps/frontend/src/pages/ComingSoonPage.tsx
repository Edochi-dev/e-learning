import { Link } from 'react-router-dom';
import { GraduationCap, Sparkles } from 'lucide-react';
import { inlineIconStyle } from '../components/inlineIcon';

/**
 * ComingSoonPage
 *
 * Página de "sitio en construcción" para el público general.
 * El acceso de administradores a rutas protegidas se maneja
 * en ComingSoonGuard, no aquí.
 */
export const ComingSoonPage = () => {
    return (
        <div className="coming-soon">
            <div className="coming-soon__card">
                <img
                    src="/images/logo-mark.png"
                    alt="Mari's Nails Academy"
                    className="coming-soon__badge"
                />

                <h1 className="coming-soon__title">Mari's Nails Academy</h1>

                <div className="coming-soon__divider" />

                <p className="coming-soon__subtitle">Algo hermoso está por llegar</p>

                <p className="coming-soon__body">
                    Estamos preparando una experiencia única para ti.
                    Muy pronto tendrás acceso a cursos, lecciones y mucho más.
                </p>

                <div className="coming-soon__tagline">
                    <Sparkles size={16} strokeWidth={1.75} aria-hidden="true" style={inlineIconStyle} />
                    Próximamente disponible
                    <Sparkles size={16} strokeWidth={1.75} aria-hidden="true" style={{ ...inlineIconStyle, marginRight: 0, marginLeft: '0.4em' }} />
                </div>

                <Link to="/login" className="coming-soon__login">
                    Acceso administradores
                </Link>
            </div>

            {/* Card secundaria: búsqueda de certificado */}
            <div className="coming-soon__cert">
                <GraduationCap className="coming-soon__cert-icon" size={28} strokeWidth={1.6} aria-hidden="true" />
                <div className="coming-soon__cert-text">
                    <p className="coming-soon__cert-title">¿Ya tienes un certificado?</p>
                    <p className="coming-soon__cert-body">Búscalo con tu número de certificado</p>
                </div>
                <Link to="/certificados/buscar" className="coming-soon__cert-link">
                    Ver mi certificado →
                </Link>
            </div>
        </div>
    );
};

import React from 'react';
import { Link } from 'react-router-dom';

/**
 * AdminDashboardPage — Hub principal del panel de administración.
 *
 * Su única responsabilidad es ser un router de intenciones: cada card es
 * una puerta a un sub-panel donde se opera con un dominio concreto (cursos,
 * certificados, etc.). Aquí NO se opera nada — no hay listas inline, no
 * hay editores, no hay delete buttons.
 *
 * Antes este componente mezclaba "puertas" con un editor inline de cursos.
 * Eso rompía la coherencia mental: el panel principal debe ser tan delgado
 * como un menú de navegación, y la operación real vive en sub-paneles
 * especializados (CoursesAdminPage, CertificatesAdminPage, ...).
 *
 * Beneficio adicional: cuando aparezca un nuevo dominio (ej. correcciones),
 * solo añadimos una card más aquí — sin tocar lógica, sin tocar gateways,
 * sin riesgo de regresión en los demás módulos.
 */
export const AdminDashboardPage: React.FC = () => {
    return (
        <div className="admin-page">
            <div className="admin-header">
                <h1>Panel de Administración</h1>
                <p>Selecciona qué quieres gestionar.</p>
            </div>

            <div className="admin-grid">
                {/* Cursos */}
                <div className="admin-card">
                    <div className="admin-card-icon">📚</div>
                    <h3>Cursos</h3>
                    <p>Crea nuevos cursos o edita los existentes con sus lecciones, videos y exámenes.</p>
                    <Link to="/admin/cursos" className="btn-primary" style={{ width: '100%', textAlign: 'center', display: 'block' }}>
                        Gestionar Cursos
                    </Link>
                </div>

                {/* Certificados */}
                <div className="admin-card">
                    <div className="admin-card-icon">🎓</div>
                    <h3>Certificados</h3>
                    <p>Sube plantillas y genera certificados con QR para tus alumnas presenciales.</p>
                    <Link to="/admin/certificados" className="btn-primary" style={{ width: '100%', textAlign: 'center', display: 'block' }}>
                        Gestionar Certificados
                    </Link>
                </div>
            </div>
        </div>
    );
};

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { CorrectionGateway } from '../../gateways/CorrectionGateway';
import type { AdminNameChangeGateway } from '../../gateways/NameChangeGateway';

/**
 * AdminDashboardPage — Hub principal del panel de administración.
 *
 * Su única responsabilidad es ser un router de intenciones: cada card es
 * una puerta a un sub-panel donde se opera con un dominio concreto (cursos,
 * certificados, correcciones, etc.). Aquí NO se opera nada — no hay listas
 * inline, no hay editores, no hay delete buttons.
 *
 * La card de Correcciones muestra un badge con el conteo de entregas
 * pendientes de revisión. Es la única card que hace fetch — las demás son
 * estáticas porque no tienen un concepto de "pendientes" que requiera
 * atención inmediata.
 */

interface Props {
    correctionGateway: CorrectionGateway;
    nameChangeGateway: AdminNameChangeGateway;
}

export const AdminDashboardPage: React.FC<Props> = ({ correctionGateway, nameChangeGateway }) => {
    const [pendingCount, setPendingCount] = useState<number>(0);
    const [nameReqCount, setNameReqCount] = useState<number>(0);

    useEffect(() => {
        correctionGateway
            .listPending()
            .then((submissions) => setPendingCount(submissions.length))
            .catch(() => setPendingCount(0));
    }, [correctionGateway]);

    useEffect(() => {
        nameChangeGateway
            .listPending()
            .then((requests) => setNameReqCount(requests.length))
            .catch(() => setNameReqCount(0));
    }, [nameChangeGateway]);

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

                {/* Correcciones */}
                <div className="admin-card">
                    <div className="admin-card-icon">✏️</div>
                    <h3>
                        Correcciones
                        {pendingCount > 0 && (
                            <span className="admin-badge">{pendingCount}</span>
                        )}
                    </h3>
                    <p>Revisa las entregas de tus alumnas, aprueba o pide correcciones con feedback.</p>
                    <Link to="/admin/correcciones" className="btn-primary" style={{ width: '100%', textAlign: 'center', display: 'block' }}>
                        Revisar Correcciones
                    </Link>
                </div>

                {/* Cambios de nombre */}
                <div className="admin-card">
                    <div className="admin-card-icon">📝</div>
                    <h3>
                        Cambios de Nombre
                        {nameReqCount > 0 && (
                            <span className="admin-badge">{nameReqCount}</span>
                        )}
                    </h3>
                    <p>Revisa y aprueba las solicitudes de cambio de nombre de los alumnos.</p>
                    <Link to="/admin/cambios-nombre" className="btn-primary" style={{ width: '100%', textAlign: 'center', display: 'block' }}>
                        Revisar Solicitudes
                    </Link>
                </div>

                {/* Agenda */}
                <div className="admin-card">
                    <div className="admin-card-icon">📅</div>
                    <h3>Agenda</h3>
                    <p>Organiza tus clases, correcciones y eventos en un calendario, sin que se solapen.</p>
                    <Link to="/admin/agenda" className="btn-primary" style={{ width: '100%', textAlign: 'center', display: 'block' }}>
                        Abrir Agenda
                    </Link>
                </div>
            </div>
        </div>
    );
};

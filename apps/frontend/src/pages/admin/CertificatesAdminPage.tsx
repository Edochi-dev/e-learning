import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { CertificateGateway, Certificate } from '../../gateways/CertificateGateway';

interface Props {
    gateway: CertificateGateway;
}

export const CertificatesAdminPage: React.FC<Props> = ({ gateway }) => {
    const { token } = useAuth();
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) return;
        gateway.listCertificates(token)
            .then(setCertificates)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [gateway, token]);

    return (
        <div className="admin-page">
            <Link to="/admin" className="back-link">← Volver al Panel</Link>
            <div className="admin-header">
                <h1>Gestión de Certificados</h1>
                <p>Administra plantillas y genera certificados para tus alumnos.</p>
            </div>

            <div className="admin-grid">
                <div className="admin-card">
                    <div className="admin-card-icon">📄</div>
                    <h3>Nueva Plantilla</h3>
                    <p>Sube un PDF en blanco y configura visualmente dónde irá el nombre y el código QR.</p>
                    <Link to="/admin/certificados/plantillas/nueva" className="btn-primary" style={{ width: '100%', textAlign: 'center', display: 'block' }}>
                        Subir Plantilla
                    </Link>
                </div>

                <div className="admin-card">
                    <div className="admin-card-icon">🎓</div>
                    <h3>Generar Certificados</h3>
                    <p>Selecciona una plantilla, ingresa los nombres y genera los certificados en lote.</p>
                    <Link to="/admin/certificados/generar" className="btn-primary" style={{ width: '100%', textAlign: 'center', display: 'block' }}>
                        Generar
                    </Link>
                </div>
            </div>

            <div style={{ marginTop: '2rem' }}>
                <h2 style={{ marginBottom: '1rem' }}>Certificados generados</h2>
                {loading ? (
                    <p style={{ color: 'var(--text-muted)' }}>Cargando...</p>
                ) : certificates.length === 0 ? (
                    <div className="admin-empty">Aún no hay certificados generados.</div>
                ) : (
                    <div className="admin-course-links">
                        {certificates.map(cert => (
                            <div key={cert.id} className="admin-course-row">
                                <span className="admin-course-link-title">{cert.recipientName}</span>
                                <span className="admin-course-link-meta">{cert.certificateNumber}</span>
                                <span className="admin-course-link-meta">
                                    {new Date(cert.issuedAt).toLocaleDateString('es-MX')}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { CertificateGateway, Certificate, CertificateTemplate } from '../../gateways/CertificateGateway';

interface Props {
    gateway: CertificateGateway;
}

export const CertificatesAdminPage: React.FC<Props> = ({ gateway }) => {
    const { token } = useAuth();
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const loadData = useCallback(() => {
        if (!token) return;
        setLoading(true);
        Promise.all([
            gateway.listCertificates(token),
            gateway.listTemplates(token),
        ])
            .then(([certs, tmpls]) => {
                setCertificates(certs);
                setTemplates(tmpls);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [gateway, token]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleDeleteTemplate = async (id: string, name: string) => {
        if (!token) return;
        if (!confirm(`¿Eliminar la plantilla "${name}"? Esta acción no se puede deshacer.`)) return;
        setDeletingId(id);
        setDeleteError(null);
        try {
            await gateway.deleteTemplate(id, token);
            setTemplates(prev => prev.filter(t => t.id !== id));
        } catch (err) {
            setDeleteError(err instanceof Error ? err.message : 'Error al eliminar');
        } finally {
            setDeletingId(null);
        }
    };

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
                <h2 style={{ marginBottom: '1rem' }}>Plantillas</h2>
                {deleteError && (
                    <p style={{ color: 'var(--error, #e53e3e)', marginBottom: '1rem', fontSize: '0.9rem' }}>{deleteError}</p>
                )}
                {loading ? (
                    <p style={{ color: 'var(--text-muted)' }}>Cargando...</p>
                ) : templates.length === 0 ? (
                    <div className="admin-empty">No hay plantillas aún.</div>
                ) : (
                    <div className="admin-course-links">
                        {templates.map(t => (
                            <div key={t.id} className="admin-course-row">
                                <span className="admin-course-link-title">{t.name}</span>
                                <span className="admin-course-link-meta">{t.courseAbbreviation} · {t.paperFormat}</span>
                                <button
                                    onClick={() => handleDeleteTemplate(t.id, t.name)}
                                    disabled={deletingId === t.id}
                                    style={{
                                        marginLeft: 'auto',
                                        background: 'none',
                                        border: '1px solid var(--error, #e53e3e)',
                                        color: 'var(--error, #e53e3e)',
                                        borderRadius: '6px',
                                        padding: '0.25rem 0.75rem',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                    }}
                                >
                                    {deletingId === t.id ? 'Eliminando...' : 'Eliminar'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
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

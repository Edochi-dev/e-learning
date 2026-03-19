import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { CertificateGateway, CertificateTemplate } from '../../gateways/CertificateGateway';

interface Props {
    gateway: CertificateGateway;
}

type DeleteStep = 'confirm' | 'choose-certs';

interface DeleteState {
    template: CertificateTemplate;
    step: DeleteStep;
}

export const CertificatesAdminPage: React.FC<Props> = ({ gateway }) => {
    const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteState, setDeleteState] = useState<DeleteState | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const loadData = useCallback(() => {
        setLoading(true);
        gateway.listTemplates()
            .then(setTemplates)
            .catch((err: unknown) => {
                setError(err instanceof Error ? err.message : 'Error al cargar las plantillas');
            })
            .finally(() => setLoading(false));
    }, [gateway]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleDeleteClick = (template: CertificateTemplate) => {
        setDeleteError(null);
        const count = template.certificateCount ?? 0;
        setDeleteState({
            template,
            step: count > 0 ? 'confirm' : 'confirm',
        });
    };

    const handleConfirm = () => {
        if (!deleteState) return;
        const count = deleteState.template.certificateCount ?? 0;
        if (count > 0) {
            // Hay certificados: mostrar paso 2 para elegir qué hacer con ellos
            setDeleteState({ ...deleteState, step: 'choose-certs' });
        } else {
            // No hay certificados: eliminar directamente
            executeDelete('keep');
        }
    };

    const executeDelete = async (certAction: 'delete' | 'keep') => {
        if (!deleteState) return;
        setDeleting(true);
        setDeleteError(null);
        try {
            await gateway.deleteTemplate(deleteState.template.id, certAction);
            setTemplates(prev => prev.filter(t => t.id !== deleteState.template.id));
            setDeleteState(null);
        } catch (err) {
            setDeleteError(err instanceof Error ? err.message : 'Error al eliminar');
        } finally {
            setDeleting(false);
        }
    };

    const closeModal = () => {
        if (deleting) return;
        setDeleteState(null);
        setDeleteError(null);
    };

    const certCount = deleteState?.template.certificateCount ?? 0;

    return (
        <div className="admin-page">
            <Link to="/admin" className="back-link">← Volver al Panel</Link>
            <div className="admin-header">
                <h1>Gestión de Certificados</h1>
                <p>Administra plantillas y genera certificados para tus alumnos.</p>
            </div>

            {error && (
                <p style={{ color: 'var(--error, #e53e3e)', marginBottom: '1rem' }}>{error}</p>
            )}

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

                <div className="admin-card">
                    <div className="admin-card-icon">🔍</div>
                    <h3>Buscar Certificado</h3>
                    <p>Busca certificados emitidos por nombre o número y visualiza o descarga el documento.</p>
                    <Link to="/admin/certificados/buscar" className="btn-primary" style={{ width: '100%', textAlign: 'center', display: 'block' }}>
                        Buscar
                    </Link>
                </div>
            </div>

            <div style={{ marginTop: '2rem' }}>
                <h2 style={{ marginBottom: '1rem' }}>Plantillas</h2>
                {loading ? (
                    <p style={{ color: 'var(--text-muted)' }}>Cargando...</p>
                ) : templates.length === 0 ? (
                    <div className="admin-empty">No hay plantillas aún.</div>
                ) : (
                    <div className="admin-course-links">
                        {templates.map(t => (
                            <div key={t.id} className="admin-course-row">
                                <span className="admin-course-link-title">{t.name}</span>
                                <span className="admin-course-link-meta">
                                    {t.courseAbbreviation} · {t.paperFormat}
                                    {(t.certificateCount ?? 0) > 0 && (
                                        <span style={{ marginLeft: '0.5rem', color: 'var(--gold, #d4a574)' }}>
                                            · {t.certificateCount} certificado(s)
                                        </span>
                                    )}
                                </span>
                                <button
                                    onClick={() => handleDeleteClick(t)}
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
                                    Eliminar
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Modal de confirmación ─────────────────────────────────── */}
            {deleteState && (
                <div
                    style={{
                        position: 'fixed', inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 1000,
                    }}
                    onClick={closeModal}
                >
                    <div
                        className="admin-card"
                        style={{ maxWidth: '440px', width: '90%', margin: 0 }}
                        onClick={e => e.stopPropagation()}
                    >
                        {deleteState.step === 'confirm' && (
                            <>
                                <h3 style={{ marginBottom: '0.75rem' }}>¿Eliminar plantilla?</h3>
                                <p style={{ marginBottom: '1.25rem', color: 'var(--text-muted)' }}>
                                    Estás a punto de eliminar la plantilla <strong>"{deleteState.template.name}"</strong>.
                                    Esta acción no se puede deshacer.
                                </p>
                                {deleteError && (
                                    <p style={{ color: 'var(--error, #e53e3e)', marginBottom: '1rem', fontSize: '0.9rem' }}>{deleteError}</p>
                                )}
                                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                    <button
                                        onClick={closeModal}
                                        disabled={deleting}
                                        style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'none', cursor: 'pointer' }}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleConfirm}
                                        disabled={deleting}
                                        style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', border: 'none', background: 'var(--error, #e53e3e)', color: '#fff', cursor: 'pointer' }}
                                    >
                                        {deleting ? 'Eliminando...' : 'Sí, eliminar'}
                                    </button>
                                </div>
                            </>
                        )}

                        {deleteState.step === 'choose-certs' && (
                            <>
                                <h3 style={{ marginBottom: '0.75rem' }}>Certificados asociados</h3>
                                <p style={{ marginBottom: '1.25rem', color: 'var(--text-muted)' }}>
                                    Esta plantilla tiene <strong>{certCount} certificado(s) emitido(s)</strong>.
                                    ¿Qué deseas hacer con ellos?
                                </p>
                                {deleteError && (
                                    <p style={{ color: 'var(--error, #e53e3e)', marginBottom: '1rem', fontSize: '0.9rem' }}>{deleteError}</p>
                                )}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <button
                                        onClick={() => executeDelete('delete')}
                                        disabled={deleting}
                                        style={{ padding: '0.6rem 1rem', borderRadius: '6px', border: 'none', background: 'var(--error, #e53e3e)', color: '#fff', cursor: 'pointer', textAlign: 'left' }}
                                    >
                                        <strong>Eliminar también</strong>
                                        <br />
                                        <span style={{ fontSize: '0.8rem', opacity: 0.85 }}>Borra la plantilla y todos sus certificados emitidos.</span>
                                    </button>
                                    <button
                                        onClick={() => executeDelete('keep')}
                                        disabled={deleting}
                                        style={{ padding: '0.6rem 1rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'none', cursor: 'pointer', textAlign: 'left' }}
                                    >
                                        <strong>Mantener certificados</strong>
                                        <br />
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            Los certificados conservan su PDF y número de folio. Quedarán
                                            desvinculados de la plantilla pero seguirán siendo válidos y descargables.
                                        </span>
                                    </button>
                                    <button
                                        onClick={closeModal}
                                        disabled={deleting}
                                        style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'none', cursor: 'pointer' }}
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

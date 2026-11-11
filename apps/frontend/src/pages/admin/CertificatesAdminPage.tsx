import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { CertificateGateway, CertificateTemplate } from '../../gateways/CertificateGateway';
import { Trash2 } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { Dialog } from '../../components/Dialog';
import { BlankCertificatesDialog } from '../../components/BlankCertificatesDialog';

interface Props {
    gateway: CertificateGateway;
}

type DeleteStep = 'confirm' | 'choose-certs';

interface DeleteState {
    template: CertificateTemplate;
    step: DeleteStep;
}

export const CertificatesAdminPage: React.FC<Props> = ({ gateway }) => {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const toast = useToast();
    const [deleteState, setDeleteState] = useState<DeleteState | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [blankTemplate, setBlankTemplate] = useState<CertificateTemplate | null>(null);

    const loadData = useCallback(() => {
        setLoading(true);
        gateway.listTemplates()
            .then(setTemplates)
            .catch((err: unknown) => {
                toast.error(err instanceof Error ? err.message : 'Error al cargar las plantillas');
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


            <div className="admin-grid">
                <div className="admin-card">
                    <div className="admin-card-icon">📄</div>
                    <h3>Nueva Plantilla</h3>
                    <p>Sube un PDF en blanco y configura visualmente dónde irá el nombre y el código QR.</p>
                    <Link to="/admin/certificados/plantillas/nueva" className="btn-primary card-action-btn">
                        Subir Plantilla
                    </Link>
                </div>

                <div className="admin-card">
                    <div className="admin-card-icon">🎓</div>
                    <h3>Generar Certificados</h3>
                    <p>Selecciona una plantilla, ingresa los nombres y genera los certificados en lote.</p>
                    <Link to="/admin/certificados/generar" className="btn-primary card-action-btn">
                        Generar
                    </Link>
                </div>

                <div className="admin-card">
                    <div className="admin-card-icon">🔍</div>
                    <h3>Buscar Certificado</h3>
                    <p>Busca certificados emitidos por nombre o número y visualiza o descarga el documento.</p>
                    <Link to="/admin/certificados/buscar" className="btn-primary card-action-btn">
                        Buscar
                    </Link>
                </div>
            </div>

            <section className="admin-section">
                <h2 className="admin-section__title">Plantillas</h2>
                {loading ? (
                    <p className="admin-section__status">Cargando...</p>
                ) : templates.length === 0 ? (
                    <div className="admin-empty">No hay plantillas aún.</div>
                ) : (
                    <div className="admin-list">
                        {templates.map(t => (
                            <div key={t.id} className="admin-row">
                                <div className="admin-row__main">
                                    <span className="admin-row__title">{t.name}</span>
                                    <span className="admin-row__meta">
                                        {t.courseAbbreviation} · {t.paperFormat}
                                        {(t.certificateCount ?? 0) > 0 && ` · ${t.certificateCount} certificado(s)`}
                                    </span>
                                </div>
                                <div className="admin-row__actions">
                                    <button
                                        type="button"
                                        className="btn-secondary btn-sm"
                                        onClick={() => navigate(`/admin/certificados/plantillas/${t.id}/editar`)}
                                    >
                                        Editar
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-secondary btn-sm"
                                        onClick={() => navigate(`/admin/certificados/plantillas/${t.id}/diseno`)}
                                    >
                                        Diseño
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-secondary btn-sm"
                                        onClick={() => setBlankTemplate(t)}
                                    >
                                        En blanco
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-danger btn-sm btn-icon"
                                        onClick={() => handleDeleteClick(t)}
                                        aria-label={`Eliminar plantilla ${t.name}`}
                                    >
                                        <Trash2 size={15} strokeWidth={2} aria-hidden />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {blankTemplate && (
                <BlankCertificatesDialog
                    gateway={gateway}
                    template={blankTemplate}
                    onClose={() => setBlankTemplate(null)}
                />
            )}

            {deleteState && (
                <Dialog
                    title={deleteState.step === 'confirm' ? '¿Eliminar plantilla?' : 'Certificados asociados'}
                    onClose={closeModal}
                    closable={!deleting}
                >
                    {deleteState.step === 'confirm' && (
                        <>
                            <p className="confirm-dialog__text">
                                Estás a punto de eliminar la plantilla <strong>"{deleteState.template.name}"</strong>.
                                Esta acción no se puede deshacer.
                            </p>
                            {deleteError && <p className="confirm-dialog__error">{deleteError}</p>}
                            <div className="confirm-dialog__actions">
                                <button type="button" className="btn-secondary" onClick={closeModal} disabled={deleting} autoFocus>
                                    Cancelar
                                </button>
                                <button type="button" className="btn-danger btn-danger--solid" onClick={handleConfirm} disabled={deleting}>
                                    {deleting ? 'Eliminando...' : 'Sí, eliminar'}
                                </button>
                            </div>
                        </>
                    )}

                    {deleteState.step === 'choose-certs' && (
                        <>
                            <p className="confirm-dialog__text">
                                Esta plantilla tiene <strong>{certCount} certificado(s) emitido(s)</strong>.
                                ¿Qué deseas hacer con ellos?
                            </p>
                            {deleteError && <p className="confirm-dialog__error">{deleteError}</p>}
                            <div className="dialog-options">
                                {/* Mantener va primero y recibe el foco: es la opción que no destruye nada. */}
                                <button
                                    type="button"
                                    className="dialog-option"
                                    onClick={() => executeDelete('keep')}
                                    disabled={deleting}
                                    autoFocus
                                >
                                    <strong>Mantener certificados</strong>
                                    <span>
                                        Los certificados conservan su PDF y número de folio. Quedarán
                                        desvinculados de la plantilla pero seguirán siendo válidos y descargables.
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    className="dialog-option dialog-option--danger"
                                    onClick={() => executeDelete('delete')}
                                    disabled={deleting}
                                >
                                    <strong>Eliminar también</strong>
                                    <span>Borra la plantilla y todos sus certificados emitidos.</span>
                                </button>
                            </div>
                            <div className="confirm-dialog__actions">
                                <button type="button" className="btn-secondary" onClick={closeModal} disabled={deleting}>
                                    Cancelar
                                </button>
                            </div>
                        </>
                    )}
                </Dialog>
            )}
        </div>
    );
};

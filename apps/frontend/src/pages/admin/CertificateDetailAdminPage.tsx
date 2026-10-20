import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { CertificateGateway } from '../../gateways/CertificateGateway';
import { useCertificate } from '../../hooks/useCertificate';
import { parseCalendarDate } from '../../lib/calendar-date';
import { saveBlob } from '../../lib/save-blob';
import { PdfPagePreview } from '../../components/PdfPagePreview';

interface Props {
    gateway: CertificateGateway;
}

/**
 * Ficha de un certificado para la admin. Misma estructura y clases que la
 * verificación pública (cert-verify), más el curso y la vuelta a la búsqueda.
 */
export const CertificateDetailAdminPage: React.FC<Props> = ({ gateway }) => {
    const { id } = useParams<{ id: string }>();
    const { certificate, loading, error } = useCertificate(gateway, id!);
    const [pdf, setPdf] = useState<Blob | null>(null);

    // Un solo Blob para la vista previa (canvas, sin iframe: Android no muestra
    // PDFs embebidos) y para la descarga.
    useEffect(() => {
        if (!certificate) return;
        const controller = new AbortController();

        gateway.downloadCertificatePdf(certificate.filePath)
            .then(blob => {
                if (!controller.signal.aborted) setPdf(blob);
            })
            .catch((err: unknown) => {
                if ((err as Error).name === 'AbortError') return;
                setPdf(null);
            });

        return () => controller.abort();
    }, [certificate, gateway]);

    if (loading) {
        return (
            <div className="admin-page admin-page--medium">
                <p className="admin-section__status">Cargando certificado...</p>
            </div>
        );
    }

    if (error || !certificate) {
        return (
            <div className="admin-page admin-page--medium">
                <Link to="/admin/certificados/buscar" className="back-link">← Volver a Buscar</Link>
                <div className="admin-empty">
                    <h2>Certificado no encontrado</h2>
                    <p>El certificado solicitado no existe o fue eliminado del sistema.</p>
                </div>
            </div>
        );
    }

    const handleDownload = async () => {
        const blob = pdf ?? await gateway.downloadCertificatePdf(certificate.filePath);
        saveBlob(blob, `${certificate.certificateNumber} - ${certificate.recipientName}.pdf`);
    };

    const issuedDate = parseCalendarDate(certificate.certificateDate).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <div className="admin-page admin-page--medium cert-verify">
            <Link to="/admin/certificados/buscar" className="back-link">← Volver a Buscar</Link>

            <header className="cert-verify__hero">
                <div className="cert-verify__hero-icon" aria-hidden="true">🎓</div>
                <h1 className="cert-verify__title">Certificado Oficial</h1>
                <p className="cert-verify__academy">Mari's Nails Academy</p>
            </header>

            <dl className="cert-verify__facts">
                <div>
                    <dt>Titular</dt>
                    <dd>{certificate.recipientName}</dd>
                </div>
                <div>
                    <dt>Número de certificado</dt>
                    <dd className="cert-verify__number">{certificate.certificateNumber}</dd>
                </div>
                <div>
                    <dt>Fecha de emisión</dt>
                    <dd>{issuedDate}</dd>
                </div>
                <div>
                    <dt>Curso</dt>
                    <dd>{certificate.templateSnapshot.name}</dd>
                </div>
            </dl>

            <p className="cert-verify__validity">
                <strong>Documento original emitido por Mari's Nails Academy.</strong> Su autenticidad
                puede verificarse públicamente con el código QR del documento o en el portal de
                verificación de la academia.
            </p>

            <button type="button" className="btn-primary cert-verify__download" onClick={handleDownload}>
                Descargar PDF
            </button>

            <section className="cert-verify__preview" aria-label="Vista previa del certificado">
                <p className="cert-verify__preview-label">Vista previa del certificado</p>
                {pdf ? (
                    <PdfPagePreview pdf={pdf} label={`Certificado ${certificate.certificateNumber} de ${certificate.recipientName}`} />
                ) : (
                    <p className="pdf-preview__fallback">Cargando vista previa...</p>
                )}
            </section>
        </div>
    );
};

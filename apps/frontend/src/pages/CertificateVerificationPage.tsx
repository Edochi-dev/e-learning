import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import type { CertificateGateway } from '../gateways/CertificateGateway';
import { useCertificate } from '../hooks/useCertificate';
import { parseCalendarDate } from '../lib/calendar-date';
import { saveBlob } from '../lib/save-blob';
import { PdfPagePreview } from '../components/PdfPagePreview';

interface Props {
    gateway: CertificateGateway;
}

/**
 * CertificateVerificationPage — Página pública de verificación de certificado
 *
 * Accedida al escanear el QR del certificado físico.
 * Muestra:
 *  - Nombre del titular
 *  - ID único del certificado (ej. MR-00001)
 *  - Fecha de otorgación
 *  - La primera página del PDF generado
 *  - Botón de descarga
 *  - Mensaje de validez de la academia
 *
 * NOTA: esta página NO importa API_URL. Toda comunicación con el backend
 * pasa por el gateway — incluyendo la descarga del PDF.
 */
export const CertificateVerificationPage: React.FC<Props> = ({ gateway }) => {
    const { id } = useParams<{ id: string }>();
    const { certificate, loading, error } = useCertificate(gateway, id!);
    const [pdf, setPdf] = useState<Blob | null>(null);

    // El PDF se baja como Blob vía gateway para que la página no conozca la URL
    // del backend; el mismo Blob sirve para la vista previa y para la descarga.
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
            <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)' }}>Verificando certificado...</p>
            </div>
        );
    }

    if (error || !certificate) {
        return (
            <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
                <div style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '2.5rem',
                    maxWidth: '480px',
                    margin: '0 auto',
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
                    <h2 style={{ marginBottom: '0.5rem' }}>Certificado no encontrado</h2>
                    <p style={{ color: 'var(--text-muted)' }}>
                        El código QR que escaneaste no corresponde a ningún certificado en nuestro sistema,
                        o el certificado ya no está disponible.
                    </p>
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
        <div className="container cert-verify">
            <header className="cert-verify__hero">
                <div className="cert-verify__hero-icon" aria-hidden="true">🎓</div>
                <h1 className="cert-verify__title">Certificado Verificado</h1>
                <p className="cert-verify__academy">Mari's Nails Academy</p>
            </header>

            <dl className="cert-verify__facts">
                <div>
                    <dt>Titular</dt>
                    <dd>{certificate.recipientName}</dd>
                </div>
                <div>
                    <dt>ID de Certificado</dt>
                    <dd className="cert-verify__number">{certificate.certificateNumber}</dd>
                </div>
                <div>
                    <dt>Fecha de otorgación</dt>
                    <dd>{issuedDate}</dd>
                </div>
            </dl>

            <p className="cert-verify__validity">
                Este certificado fue <strong>otorgado oficialmente por Mari's Nails Academy</strong> y acredita la participación
                y aprobación del curso correspondiente. La validez del certificado puede verificarse
                mediante el código QR incluido en el documento físico o a través de esta página.
            </p>

            <button className="btn-primary cert-verify__download" onClick={handleDownload}>
                Descargar Certificado (PDF)
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

import React from 'react';
import { useParams } from 'react-router-dom';
import type { CertificateGateway } from '../gateways/CertificateGateway';
import { useCertificate } from '../hooks/useCertificate';

interface Props {
    gateway: CertificateGateway;
}

const API_URL = import.meta.env.VITE_API_URL;

/**
 * CertificateVerificationPage — Página pública de verificación de certificado
 *
 * Accedida al escanear el QR del certificado físico.
 * Muestra:
 *  - Nombre del titular
 *  - ID único del certificado (ej. MR-00001)
 *  - Fecha de otorgación
 *  - El PDF generado (embed para visualizar)
 *  - Botón de descarga
 *  - Mensaje de validez de la academia
 */
export const CertificateVerificationPage: React.FC<Props> = ({ gateway }) => {
    const { id } = useParams<{ id: string }>();
    const { certificate, loading, error } = useCertificate(gateway, id!);

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
                    background: 'var(--bg-card)',
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

    const pdfUrl = `${API_URL}${certificate.filePath.replace('/static', '/static')}`;

    const handleDownload = async () => {
        const res = await fetch(pdfUrl);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${certificate.certificateNumber} - ${certificate.recipientName}.pdf`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
    };

    const issuedDate = new Date(certificate.issuedAt).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <div className="container" style={{ padding: '3rem 1rem', maxWidth: '860px', margin: '0 auto' }}>

            {/* Encabezado de verificación */}
            <div style={{
                background: 'linear-gradient(135deg, var(--primary), var(--gold))',
                borderRadius: '16px',
                padding: '2rem',
                color: 'white',
                marginBottom: '2rem',
                textAlign: 'center',
            }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎓</div>
                <h1 style={{ margin: 0, fontSize: '1.6rem', fontFamily: 'var(--font-heading)' }}>
                    Certificado Verificado
                </h1>
                <p style={{ margin: '0.25rem 0 0', opacity: 0.9 }}>
                    Mari's Nails Academy
                </p>
            </div>

            {/* Datos del certificado */}
            <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '1.75rem',
                marginBottom: '1.5rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1.25rem',
            }}>
                <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Titular</p>
                    <p style={{ fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>{certificate.recipientName}</p>
                </div>
                <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ID de Certificado</p>
                    <p style={{ fontWeight: 700, fontSize: '1.1rem', margin: 0, fontFamily: 'monospace', color: 'var(--primary)' }}>{certificate.certificateNumber}</p>
                </div>
                <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fecha de otorgación</p>
                    <p style={{ fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>{issuedDate}</p>
                </div>
            </div>

            {/* Mensaje de validez */}
            <div style={{
                background: 'var(--bg-secondary, #f9f9f9)',
                border: '1px solid var(--border)',
                borderLeft: '4px solid var(--primary)',
                borderRadius: '8px',
                padding: '1.25rem 1.5rem',
                marginBottom: '1.5rem',
                fontSize: '0.9rem',
                lineHeight: 1.6,
                color: 'var(--text)',
            }}>
                Este certificado fue <strong>otorgado oficialmente por Mari's Nails Academy</strong> y acredita la participación
                y aprobación del curso correspondiente. La validez del certificado puede verificarse
                mediante el código QR incluido en el documento físico o a través de esta página.
            </div>

            {/* Botón de descarga */}
            <div style={{ marginBottom: '1.5rem' }}>
                <button className="btn-primary" onClick={handleDownload} style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}>
                    Descargar Certificado (PDF)
                </button>
            </div>

            {/* Preview del PDF */}
            <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                overflow: 'hidden',
            }}>
                <p style={{ padding: '1rem 1.5rem 0', color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                    Vista previa del certificado
                </p>
                <iframe
                    src={pdfUrl}
                    title="Certificado digital"
                    style={{ width: '100%', height: '600px', border: 'none', display: 'block' }}
                />
            </div>
        </div>
    );
};

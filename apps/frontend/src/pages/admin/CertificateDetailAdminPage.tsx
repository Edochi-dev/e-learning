import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { CertificateGateway } from '../../gateways/CertificateGateway';
import { useCertificate } from '../../hooks/useCertificate';

interface Props {
    gateway: CertificateGateway;
}

import { API_URL } from '../../config';

export const CertificateDetailAdminPage: React.FC<Props> = ({ gateway }) => {
    const { id } = useParams<{ id: string }>();
    const { certificate, loading, error } = useCertificate(gateway, id!);
    const [blobUrl, setBlobUrl] = useState<string | null>(null);

    // Descargamos el PDF como Blob para evitar el bloqueo CSP del iframe
    // (el backend tiene frame-ancestors 'self', que bloquea iframes desde otro origen)
    useEffect(() => {
        if (!certificate) return;
        const controller = new AbortController();
        const pdfUrl = `${API_URL}${certificate.filePath}`;
        fetch(pdfUrl, { signal: controller.signal })
            .then(res => res.blob())
            .then(blob => setBlobUrl(URL.createObjectURL(blob)))
            .catch((err: unknown) => {
                if ((err as Error).name === 'AbortError') return;
                setBlobUrl(null);
            });

        return () => {
            controller.abort();
            setBlobUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
        };
    }, [certificate]);

    if (loading) {
        return (
            <div className="admin-page">
                <p style={{ color: 'var(--text-muted)' }}>Cargando certificado...</p>
            </div>
        );
    }

    if (error || !certificate) {
        return (
            <div className="admin-page">
                <Link to="/admin/certificados/buscar" className="back-link">← Volver a Buscar</Link>
                <div style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '2.5rem',
                    maxWidth: '480px',
                    textAlign: 'center',
                    marginTop: '2rem',
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                    <h2 style={{ marginBottom: '0.5rem' }}>Certificado no encontrado</h2>
                    <p style={{ color: 'var(--text-muted)' }}>
                        El certificado solicitado no existe o fue eliminado del sistema.
                    </p>
                </div>
            </div>
        );
    }

    const handleDownload = async () => {
        const res = await fetch(`${API_URL}${certificate.filePath}`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${certificate.certificateNumber} - ${certificate.recipientName}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const issuedDate = new Date(certificate.issuedAt).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <div className="admin-page" style={{ maxWidth: '860px' }}>
            <Link to="/admin/certificados/buscar" className="back-link">← Volver a Buscar</Link>

            {/* 1. Encabezado con gradiente de la academia */}
            <div style={{
                background: 'linear-gradient(135deg, var(--primary), var(--gold))',
                borderRadius: '16px',
                padding: '2rem',
                color: 'white',
                marginBottom: '1.5rem',
                textAlign: 'center',
            }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎓</div>
                <h1 style={{ margin: 0, fontSize: '1.6rem', fontFamily: 'var(--font-heading)' }}>
                    Certificado Oficial
                </h1>
                <p style={{ margin: '0.25rem 0 0', opacity: 0.9, fontSize: '1rem' }}>
                    Mari's Nails Academy
                </p>
            </div>

            {/* 2. Vista previa del PDF — justo debajo del badge */}
            <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                overflow: 'hidden',
                marginBottom: '1.5rem',
            }}>
                {blobUrl ? (
                    <iframe
                        src={`${blobUrl}#zoom=page-width&navpanes=0&toolbar=1`}
                        title={`Certificado ${certificate.certificateNumber}`}
                        style={{ width: '100%', height: '600px', border: 'none', display: 'block' }}
                    />
                ) : (
                    <p style={{ padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                        Cargando vista previa...
                    </p>
                )}
            </div>

            {/* 3. Datos del certificado + botón de descarga */}
            <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '1.75rem',
                marginBottom: '1.5rem',
            }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '1.25rem',
                    marginBottom: '1.5rem',
                }}>
                    <div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Titular</p>
                        <p style={{ fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>{certificate.recipientName}</p>
                    </div>
                    <div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Número de Certificado</p>
                        <p style={{ fontWeight: 700, fontSize: '1.1rem', margin: 0, fontFamily: 'monospace', color: 'var(--primary)' }}>{certificate.certificateNumber}</p>
                    </div>
                    <div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fecha de Emisión</p>
                        <p style={{ fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>{issuedDate}</p>
                    </div>
                    {certificate.template && (
                        <div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Curso</p>
                            <p style={{ fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>{certificate.template.name}</p>
                        </div>
                    )}
                </div>

                {/* Botón de descarga — esquina inferior derecha del bloque de info */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        className="btn-primary"
                        onClick={handleDownload}
                        style={{ padding: '0.65rem 1.75rem', fontSize: '0.95rem' }}
                    >
                        Descargar PDF
                    </button>
                </div>
            </div>

            {/* 4. Sello de autenticidad */}
            <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderLeft: '4px solid var(--gold)',
                borderRadius: '8px',
                padding: '1.25rem 1.5rem',
                marginBottom: '1.5rem',
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-start',
            }}>
                <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>✅</span>
                <div style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--text)' }}>
                    <strong style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--text)' }}>
                        Documento Original — Emitido por Mari's Nails Academy
                    </strong>
                    Este certificado acredita la participación y aprobación del curso correspondiente.
                    Su autenticidad puede verificarse públicamente mediante el código QR incluido en el
                    documento o a través del portal de verificación de la academia.
                </div>
            </div>
        </div>
    );
};

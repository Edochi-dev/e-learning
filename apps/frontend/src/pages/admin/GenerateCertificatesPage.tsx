import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { CertificateGateway, CertificateTemplate, GeneratedCertificateSummary } from '../../gateways/CertificateGateway';

interface Props {
    gateway: CertificateGateway;
}

export const GenerateCertificatesPage: React.FC<Props> = ({ gateway }) => {
    const { token } = useAuth();
    const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [namesText, setNamesText] = useState('');
    const [generated, setGenerated] = useState<GeneratedCertificateSummary[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!token) return;
        gateway.listTemplates(token).then(setTemplates).catch(console.error);
    }, [gateway, token]);

    const handleGenerate = async () => {
        if (!token || !selectedTemplateId || !namesText.trim()) return;
        const names = namesText.split('\n').map(n => n.trim()).filter(Boolean);
        if (names.length === 0) return;

        setLoading(true);
        setError(null);
        try {
            const result = await gateway.generateBatch(selectedTemplateId, names, token);
            setGenerated(result);
            setSelected(new Set(result.map(c => c.id)));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al generar certificados');
        } finally {
            setLoading(false);
        }
    };

    const toggleSelect = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleDownload = async () => {
        if (!token || selected.size === 0) return;
        setLoading(true);
        try {
            const ids = Array.from(selected);
            const blob = await gateway.downloadBatch(ids, token);
            const filename = ids.length === 1 ? 'certificado.pdf' : 'certificados.zip';
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al descargar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-page">
            <div className="admin-header">
                <h1>Generar Certificados</h1>
                <p>Selecciona una plantilla, ingresa los nombres y genera los PDFs.</p>
            </div>

            <div className="admin-card" style={{ maxWidth: '640px' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <label className="form-label">Plantilla</label>
                    <select
                        className="form-input"
                        value={selectedTemplateId}
                        onChange={e => setSelectedTemplateId(e.target.value)}
                    >
                        <option value="">-- Selecciona una plantilla --</option>
                        {templates.map(t => (
                            <option key={t.id} value={t.id}>
                                {t.name} ({t.courseAbbreviation})
                            </option>
                        ))}
                    </select>
                    {templates.length === 0 && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                            No hay plantillas. <a href="/admin/certificados/plantillas/nueva">Sube una primero.</a>
                        </p>
                    )}
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label className="form-label">
                        Nombres (uno por línea)
                    </label>
                    <textarea
                        className="form-input"
                        rows={8}
                        placeholder={"Ana García\nBeatriz López\nCarolina Martínez"}
                        value={namesText}
                        onChange={e => setNamesText(e.target.value)}
                        style={{ fontFamily: 'monospace', resize: 'vertical' }}
                    />
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {namesText.split('\n').filter(n => n.trim()).length} nombre(s)
                    </p>
                </div>

                {error && (
                    <p style={{ color: 'var(--error, #e53e3e)', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</p>
                )}

                <button
                    className="btn-primary"
                    onClick={handleGenerate}
                    disabled={loading || !selectedTemplateId || !namesText.trim()}
                >
                    {loading ? 'Generando...' : 'Generar Certificados'}
                </button>
            </div>

            {generated.length > 0 && (
                <div style={{ marginTop: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h2>Certificados generados ({generated.length})</h2>
                        <button
                            className="btn-primary"
                            onClick={handleDownload}
                            disabled={loading || selected.size === 0}
                        >
                            {loading ? 'Descargando...' : `Descargar ${selected.size > 1 ? `(${selected.size}) ZIP` : 'PDF'}`}
                        </button>
                    </div>

                    <div className="admin-course-links">
                        {generated.map(cert => (
                            <div key={cert.id} className="admin-course-row" style={{ cursor: 'pointer' }} onClick={() => toggleSelect(cert.id)}>
                                <input
                                    type="checkbox"
                                    checked={selected.has(cert.id)}
                                    onChange={() => toggleSelect(cert.id)}
                                    onClick={e => e.stopPropagation()}
                                    style={{ marginRight: '0.75rem', accentColor: 'var(--primary)' }}
                                />
                                <span className="admin-course-link-title">{cert.recipientName}</span>
                                <span className="admin-course-link-meta" style={{ fontFamily: 'monospace' }}>{cert.certificateNumber}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

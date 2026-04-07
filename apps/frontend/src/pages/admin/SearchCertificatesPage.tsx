import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { CertificateGateway } from '../../gateways/CertificateGateway';
import { useCertificates } from '../../hooks/useCertificates';

interface Props {
    gateway: CertificateGateway;
}

export const SearchCertificatesPage: React.FC<Props> = ({ gateway }) => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');

    const {
        certificates,
        loading,
        error,
        loadCertificates,
        searchCertificates,
    } = useCertificates(gateway);

    // Carga todos los certificados al montar la página
    useEffect(() => { loadCertificates(); }, [loadCertificates]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        searchCertificates(query);
    };

    const handleClear = () => {
        setQuery('');
        loadCertificates();
    };

    return (
        <div className="admin-page">
            <Link to="/admin/certificados" className="back-link">← Volver a Certificados</Link>

            <div className="admin-header">
                <h1>Buscar Certificado</h1>
                <p>Busca por nombre del titular o número de certificado (ej. MR-00001).</p>
            </div>

            {/* Buscador */}
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
                <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Nombre o número de certificado..."
                    className="form-input"
                    style={{ flex: 1 }}
                />
                <button type="submit" className="btn-primary" style={{ padding: '0.6rem 1.5rem' }}>
                    Buscar
                </button>
                {query && (
                    <button
                        type="button"
                        onClick={handleClear}
                        style={{
                            padding: '0.6rem 1rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            background: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                        }}
                    >
                        Limpiar
                    </button>
                )}
            </form>

            {/* Resultados */}
            {loading && <p style={{ color: 'var(--text-muted)' }}>Buscando...</p>}
            {error && <p style={{ color: 'var(--error, #e53e3e)' }}>{error}</p>}

            {!loading && !error && certificates.length === 0 && (
                <div className="admin-empty">
                    {query ? `No se encontraron resultados para "${query}".` : 'Aún no hay certificados generados.'}
                </div>
            )}

            {!loading && certificates.length > 0 && (
                <div className="admin-course-links">
                    {certificates.map(cert => (
                        <div key={cert.id} className="admin-course-row">
                            <span className="admin-course-link-title">{cert.recipientName}</span>
                            <span className="admin-course-link-meta" style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>
                                {cert.certificateNumber}
                            </span>
                            <span className="admin-course-link-meta">
                                {new Date(cert.issuedAt).toLocaleDateString('es-MX')}
                            </span>
                            <span className="admin-course-link-meta" style={{
                                color: 'var(--text-muted)',
                                fontSize: '0.8rem',
                            }}>
                                {cert.templateSnapshot.name}
                            </span>
                            <button
                                onClick={() => navigate(`/admin/certificados/ver/${cert.id}`)}
                                style={{
                                    marginLeft: 'auto',
                                    background: 'none',
                                    border: '1px solid var(--primary)',
                                    color: 'var(--primary)',
                                    borderRadius: '6px',
                                    padding: '0.25rem 0.75rem',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                }}
                            >
                                Ver
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

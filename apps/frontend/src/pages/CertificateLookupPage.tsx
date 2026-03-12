import React, { useState } from 'react';
import type { CertificateGateway } from '../gateways/CertificateGateway';
import { useCertificateLookup } from '../hooks/useCertificateLookup';

interface Props {
    gateway: CertificateGateway;
}

/**
 * CertificateLookupPage — Búsqueda pública de certificado por número correlativo
 *
 * El alumno ingresa su ID (ej: MR-00001) y el sistema lo redirige
 * automáticamente a la página de verificación /certificados/:uuid.
 */
export const CertificateLookupPage: React.FC<Props> = ({ gateway }) => {
    const [number, setNumber] = useState('');
    const { lookup, loading, error } = useCertificateLookup(gateway);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        lookup(number);
    }

    return (
        <div className="container" style={{ padding: '4rem 1rem', maxWidth: '540px', margin: '0 auto' }}>

            {/* Encabezado */}
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎓</div>
                <h1 style={{ fontFamily: 'var(--font-heading)', marginBottom: '0.5rem' }}>
                    Busca tu Certificado
                </h1>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    Ingresa el ID de tu certificado tal como aparece en el documento recibido.
                    Por ejemplo: <span style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>MR-00001</span>
                </p>
            </div>

            {/* Formulario */}
            <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '2rem',
            }}>
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
                            Número de certificado
                        </label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Ej: MR-00001"
                            value={number}
                            onChange={e => setNumber(e.target.value)}
                            style={{ width: '100%', fontFamily: 'monospace', fontSize: '1.1rem', textTransform: 'uppercase' }}
                            autoFocus
                        />
                    </div>

                    {error && (
                        <div style={{
                            background: 'var(--error-bg, #fff0f0)',
                            border: '1px solid var(--error-border, #f5c6cb)',
                            borderRadius: '8px',
                            padding: '0.75rem 1rem',
                            marginBottom: '1.25rem',
                            color: 'var(--error-text, #721c24)',
                            fontSize: '0.9rem',
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading || !number.trim()}
                        style={{ width: '100%', padding: '0.85rem', fontSize: '1rem' }}
                    >
                        {loading ? 'Buscando...' : 'Buscar certificado'}
                    </button>
                </form>
            </div>
        </div>
    );
};

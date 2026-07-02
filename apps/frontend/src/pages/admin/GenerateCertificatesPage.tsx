import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { CertificateGateway, CertificateTemplate, GeneratedCertificateSummary, CertificateRecipient } from '../../gateways/CertificateGateway';
import type { AuthGateway } from '../../gateways/AuthGateway';
import type { User } from '@maris-nails/shared';
import { useToast } from '../../components/Toast';

interface Props {
    gateway: CertificateGateway;
    authGateway: AuthGateway;
}

export const GenerateCertificatesPage: React.FC<Props> = ({ gateway, authGateway }) => {
    const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [namesText, setNamesText] = useState('');
    const [generated, setGenerated] = useState<GeneratedCertificateSummary[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const toast = useToast();

    // ── Vinculación a alumnos registrados (modo híbrido) ──────────────────
    const [users, setUsers] = useState<User[]>([]);
    const [pickedUserIds, setPickedUserIds] = useState<Set<string>>(new Set());
    const [userSearch, setUserSearch] = useState('');

    // Nombres libres (sin cuenta) escritos en el textarea.
    const freeNames = useMemo(
        () => namesText.split('\n').map(n => n.trim()).filter(Boolean),
        [namesText],
    );
    // Alumnos registrados elegidos (quedarán ligados por userId).
    const pickedUsers = useMemo(
        () => users.filter(u => pickedUserIds.has(u.id)),
        [users, pickedUserIds],
    );
    const recipientCount = freeNames.length + pickedUsers.length;

    // Resultados del buscador (typeahead): solo con 2+ caracteres, excluye a
    // los ya elegidos y limita a 8 para no volcar toda la base de alumnos.
    const searchResults = useMemo(() => {
        const q = userSearch.trim().toLowerCase();
        if (q.length < 2) return [];
        return users
            .filter(u => !pickedUserIds.has(u.id))
            .filter(u => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
            .slice(0, 8);
    }, [users, userSearch, pickedUserIds]);

    // Añade un alumno a los vinculados y limpia el buscador.
    const addPick = (id: string) => {
        setPickedUserIds(prev => new Set(prev).add(id));
        setUserSearch('');
    };

    // Quita un alumno de los vinculados (desde su chip).
    const removePick = (id: string) => {
        setPickedUserIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    };

    useEffect(() => {
        gateway.listTemplates().then(setTemplates).catch((err: unknown) => {
            toast.error(err instanceof Error ? err.message : 'Error al cargar las plantillas');
        });
    }, [gateway]);

    useEffect(() => {
        // Carga de alumnos para poder vincular. Silenciosa: si falla, aún se
        // puede generar por nombre libre (la vinculación es opcional).
        authGateway.getAllUsers().then(setUsers).catch(() => undefined);
    }, [authGateway]);

    const handleGenerate = async () => {
        if (!selectedTemplateId || recipientCount === 0) return;

        // Combinamos: nombres libres (sin userId) + alumnos elegidos (con userId).
        const recipients: CertificateRecipient[] = [
            ...freeNames.map(name => ({ name })),
            ...pickedUsers.map(u => ({ name: u.fullName, userId: u.id })),
        ];

        setLoading(true);
        try {
            const result = await gateway.generateBatch(selectedTemplateId, recipients);
            setGenerated(result);
            setSelected(new Set(result.map(c => c.id)));
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Error al generar certificados');
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
        if (selected.size === 0) return;
        setLoading(true);
        try {
            const ids = Array.from(selected);
            const blob = await gateway.downloadBatch(ids);
            const filename = ids.length === 1 ? 'certificado.pdf' : 'certificados.zip';
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 100);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Error al descargar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-page">
            <Link to="/admin/certificados" className="back-link">← Volver al Panel de Certificados</Link>
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
                        Nombres libres (uno por línea)
                    </label>
                    <textarea
                        className="form-input"
                        rows={6}
                        placeholder={"Ana García\nBeatriz López\nCarolina Martínez"}
                        value={namesText}
                        onChange={e => setNamesText(e.target.value)}
                        style={{ fontFamily: 'monospace', resize: 'vertical' }}
                    />
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {freeNames.length} nombre(s) sin cuenta · no aparecerán en "mis certificados"
                    </p>
                </div>

                {/* Vinculación híbrida: buscar alumnos registrados para que el
                    certificado quede ligado a su cuenta. Solo buscador (typeahead):
                    con muchos alumnos, listar a todos no tendría sentido. */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <label className="form-label">Vincular a alumnos registrados (opcional)</label>
                    <div className="user-picker">
                        <div className="user-picker__search">
                            <svg
                                className="user-picker__search-icon"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                            >
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <input
                                type="search"
                                className="user-picker__input"
                                placeholder="Buscar alumno por nombre o email…"
                                value={userSearch}
                                onChange={e => setUserSearch(e.target.value)}
                                aria-label="Buscar alumno para vincular"
                            />
                        </div>
                        {searchResults.length > 0 && (
                            <ul className="user-picker__results">
                                {searchResults.map(u => (
                                    <li key={u.id}>
                                        <button
                                            type="button"
                                            className="user-picker__result"
                                            onClick={() => addPick(u.id)}
                                        >
                                            <span className="user-picker__result-name">{u.fullName}</span>
                                            <span className="user-picker__result-email">{u.email}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {userSearch.trim().length >= 2 && searchResults.length === 0 && (
                            <p className="user-picker__hint">
                                {users.length === 0 ? 'No hay alumnos registrados.' : 'Sin coincidencias.'}
                            </p>
                        )}
                    </div>
                    {pickedUsers.length > 0 && (
                        <>
                            <div className="user-picker__chips">
                                {pickedUsers.map(u => (
                                    <span key={u.id} className="user-picker__chip">
                                        {u.fullName}
                                        <button
                                            type="button"
                                            className="user-picker__chip-remove"
                                            onClick={() => removePick(u.id)}
                                            aria-label={`Quitar a ${u.fullName}`}
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                                {pickedUsers.length} alumno(s) vinculado(s)
                            </p>
                        </>
                    )}
                </div>

                <button
                    className="btn-primary"
                    onClick={handleGenerate}
                    disabled={loading || !selectedTemplateId || recipientCount === 0}
                >
                    {loading ? 'Generando...' : `Generar Certificados (${recipientCount})`}
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

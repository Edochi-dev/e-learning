import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { NameChangeGateway } from '../../gateways/NameChangeGateway';
import type { NameChangeRequest } from '@maris-nails/shared';
import { useToast } from '../../components/Toast';

interface Props {
    gateway: NameChangeGateway;
}

/**
 * NameChangeRequestsAdminPage — Cola de solicitudes de cambio de nombre.
 *
 * El admin ve las solicitudes pendientes (nombre actual → nombre pedido) y las
 * aprueba o rechaza. Al aprobar, el backend aplica el nuevo nombre al usuario
 * (sus iniciales se regeneran solas). El feedback es obligatorio para rechazar.
 */
export const NameChangeRequestsAdminPage: React.FC<Props> = ({ gateway }) => {
    const [requests, setRequests] = useState<NameChangeRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});
    const [busyId, setBusyId] = useState<string | null>(null);
    const toast = useToast();

    const load = useCallback(() => {
        setLoading(true);
        gateway
            .listPending()
            .then(setRequests)
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, [gateway]);

    useEffect(() => {
        load();
    }, [load]);

    const handleReview = async (id: string, action: 'approve' | 'reject') => {
        const feedback = feedbacks[id]?.trim() || undefined;
        if (action === 'reject' && !feedback) {
            toast.error('Indica un motivo para rechazar la solicitud.');
            return;
        }
        setBusyId(id);
        try {
            await gateway.review(id, action, feedback);
            // La quitamos de la cola: ya no está pendiente.
            setRequests((prev) => prev.filter((r) => r.id !== id));
            toast.success(
                action === 'approve' ? 'Solicitud aprobada.' : 'Solicitud rechazada.',
            );
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : 'No se pudo procesar la solicitud',
            );
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="admin-page">
            <Link to="/admin" className="back-link">← Volver al Panel</Link>
            <div className="admin-header">
                <h1>Solicitudes de Cambio de Nombre</h1>
                <p>Aprueba o rechaza los cambios de nombre solicitados por los alumnos.</p>
            </div>

            {loading && (
                <div className="admin-card"><p style={{ margin: 0 }}>Cargando…</p></div>
            )}

            {!loading && error && (
                <div className="admin-card">
                    <p style={{ margin: 0 }}>No se pudieron cargar las solicitudes.</p>
                </div>
            )}

            {!loading && !error && requests.length === 0 && (
                <div className="admin-card">
                    <p style={{ margin: 0 }}>No hay solicitudes pendientes. 🎉</p>
                </div>
            )}

            {!loading && !error && requests.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {requests.map((req) => (
                        <div key={req.id} className="admin-card">
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'baseline', justifyContent: 'space-between' }}>
                                <p style={{ margin: 0, fontSize: '1.05rem' }}>
                                    <strong>{req.currentName}</strong>
                                    <span style={{ color: 'var(--text-muted)', margin: '0 0.5rem' }}>→</span>
                                    <strong style={{ color: 'var(--primary)' }}>{req.requestedName}</strong>
                                </p>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    {new Date(req.createdAt).toLocaleDateString('es', {
                                        day: '2-digit', month: 'long', year: 'numeric',
                                    })}
                                </span>
                            </div>

                            <textarea
                                className="form-input"
                                rows={2}
                                placeholder="Motivo (obligatorio para rechazar, opcional al aprobar)"
                                value={feedbacks[req.id] ?? ''}
                                onChange={(e) => setFeedbacks((prev) => ({ ...prev, [req.id]: e.target.value }))}
                                style={{ marginTop: '0.75rem', resize: 'vertical' }}
                            />

                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                                <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={() => handleReview(req.id, 'approve')}
                                    disabled={busyId === req.id}
                                >
                                    Aprobar
                                </button>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => handleReview(req.id, 'reject')}
                                    disabled={busyId === req.id}
                                >
                                    Rechazar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

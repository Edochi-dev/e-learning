import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { InvitationStatus } from '@maris-nails/shared';
import type {
    AdminInvitationGateway,
    CourseInvitationRow,
    CreatedInvitation,
} from '../../gateways/InvitationGateway';
import type { CourseGateway } from '../../gateways/CourseGateway';
import { useToast } from '../../components/Toast';

interface CourseInvitationsPageProps {
    gateway: AdminInvitationGateway;
    courseGateway: CourseGateway;
}

const STATUS_LABELS: Record<string, string> = {
    [InvitationStatus.VALID]: 'Sin usar',
    [InvitationStatus.REDEEMED]: 'Canjeada',
    [InvitationStatus.EXPIRED]: 'Caducada',
    [InvitationStatus.REVOKED]: 'Anulada',
};

const formatDate = (iso: string): string =>
    new Date(iso).toLocaleDateString('es', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

/**
 * CourseInvitationsPage — La profesora genera y reparte enlaces.
 *
 * Detalle que condiciona toda la pantalla: los tokens en claro llegan UNA sola
 * vez, en la respuesta que los crea. No se guardan en la base de datos, así que
 * al recargar dejan de estar disponibles para siempre. De ahí que los recién
 * generados se muestren aparte, con aviso, y con el mensaje listo para copiar.
 */
export const CourseInvitationsPage = ({
    gateway,
    courseGateway,
}: CourseInvitationsPageProps) => {
    const { courseId } = useParams<{ courseId: string }>();
    const toast = useToast();

    const [courseTitle, setCourseTitle] = useState('');
    const [rows, setRows] = useState<CourseInvitationRow[]>([]);
    const [loading, setLoading] = useState(true);

    const [notes, setNotes] = useState('');
    const [count, setCount] = useState(1);
    const [validityDays, setValidityDays] = useState(30);
    const [generating, setGenerating] = useState(false);
    const [justCreated, setJustCreated] = useState<CreatedInvitation[]>([]);

    const load = useCallback(async () => {
        if (!courseId) return;
        setLoading(true);
        try {
            const [course, list] = await Promise.all([
                courseGateway.findOne(courseId),
                gateway.list(courseId),
            ]);
            setCourseTitle(course.title);
            setRows(list);
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : 'Error al cargar las invitaciones',
            );
        } finally {
            setLoading(false);
        }
    }, [courseId, courseGateway, gateway, toast]);

    useEffect(() => {
        void load();
    }, [load]);

    /** Una nota por línea; si no hay ninguna, se generan `count` sin etiqueta. */
    const labelsFromForm = (): string[] => {
        const lines = notes
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        return lines.length > 0 ? lines : Array.from({ length: count }, () => '');
    };

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!courseId) return;

        setGenerating(true);
        try {
            const created = await gateway.create(
                courseId,
                labelsFromForm(),
                validityDays,
            );
            setJustCreated(created);
            setNotes('');
            await load();
            toast.success(`${created.length} invitación(es) generada(s)`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'No se pudieron generar');
        } finally {
            setGenerating(false);
        }
    };

    const invitationUrl = (token: string) =>
        `${window.location.origin}/invitacion/${token}`;

    /** Mensaje listo para pegar en WhatsApp: menos pasos, menos errores. */
    const whatsappMessage = (invitation: CreatedInvitation) =>
        `¡Hola! Aquí tienes tu acceso a "${courseTitle}" 💅\n\n` +
        `${invitationUrl(invitation.token)}\n\n` +
        `Ábrelo y crea tu cuenta con el nombre que quieres que salga en tu certificado. ` +
        `El enlace sirve una sola vez y caduca el ${formatDate(invitation.expiresAt)}.`;

    const copy = async (text: string, what: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success(`${what} copiado`);
        } catch {
            toast.error('Tu navegador no permitió copiar');
        }
    };

    const handleRevoke = async (id: string) => {
        try {
            await gateway.revoke(id);
            await load();
            toast.success('Invitación anulada');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'No se pudo anular');
        }
    };

    if (loading) {
        return (
            <div className="admin-page">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="admin-page">
            <Link to="/admin/cursos" className="back-link">← Volver a Cursos</Link>

            <div className="admin-page__header">
                <h1>Invitaciones de {courseTitle}</h1>
                <p className="admin-page__subtitle">
                    Cada enlace sirve una sola vez. Quien lo abre crea su cuenta y
                    entra al curso.
                </p>
            </div>

            <form onSubmit={handleGenerate} className="admin-form invitation-generator">
                <div className="form-group">
                    <label htmlFor="notes">Notas (una por línea, opcional)</label>
                    <textarea
                        id="notes"
                        rows={4}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder={'María — grupo marzo\nAna — pagó por Zelle'}
                    />
                    <small className="form-hint">
                        Solo las ves tú: te sirven para saber a quién le diste cada
                        enlace. Se genera una invitación por línea.
                    </small>
                </div>

                {notes.trim().length === 0 && (
                    <div className="form-group">
                        <label htmlFor="count">¿Cuántas invitaciones?</label>
                        <input
                            id="count"
                            type="number"
                            min={1}
                            max={100}
                            value={count}
                            onChange={(e) => setCount(Number(e.target.value))}
                        />
                    </div>
                )}

                <div className="form-group">
                    <label htmlFor="validityDays">El enlace caduca en (días)</label>
                    <input
                        id="validityDays"
                        type="number"
                        min={1}
                        max={365}
                        value={validityDays}
                        onChange={(e) => setValidityDays(Number(e.target.value))}
                    />
                    <small className="form-hint">
                        Es el plazo para ABRIR el enlace. Los días de acceso al curso
                        empiezan a contar cuando la alumna lo activa.
                    </small>
                </div>

                <button type="submit" className="btn-primary" disabled={generating}>
                    {generating ? 'Generando...' : 'Generar invitaciones'}
                </button>
            </form>

            {justCreated.length > 0 && (
                <div className="invitation-fresh">
                    <h2>Enlaces generados</h2>
                    <p className="invitation-fresh__warning">
                        ⚠️ Cópialos ahora. Por seguridad no se guardan, así que al salir
                        de esta pantalla no habrá forma de volver a verlos: tendrías que
                        generar otros.
                    </p>

                    {justCreated.map((invitation) => (
                        <div key={invitation.id} className="invitation-fresh__row">
                            <div className="invitation-fresh__info">
                                <strong>{invitation.label ?? 'Sin nota'}</strong>
                                <code className="invitation-fresh__url">
                                    {invitationUrl(invitation.token)}
                                </code>
                            </div>
                            <div className="invitation-fresh__actions">
                                <button
                                    type="button"
                                    className="btn-secondary btn-sm"
                                    onClick={() =>
                                        void copy(
                                            whatsappMessage(invitation),
                                            'Mensaje',
                                        )
                                    }
                                >
                                    Copiar mensaje
                                </button>
                                <button
                                    type="button"
                                    className="btn-secondary btn-sm"
                                    onClick={() =>
                                        void copy(
                                            invitationUrl(invitation.token),
                                            'Enlace',
                                        )
                                    }
                                >
                                    Solo el enlace
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <h2 className="invitation-list__title">
                Historial ({rows.length})
            </h2>

            {rows.length === 0 ? (
                <p className="admin-page__subtitle">
                    Todavía no has generado invitaciones para este curso.
                </p>
            ) : (
                <div className="students-table">
                    {rows.map((row) => (
                        <article key={row.id} className="student-row">
                            <div className="student-row__identity">
                                <strong>{row.label ?? 'Sin nota'}</strong>
                                <span className="student-row__email">
                                    Creada el {formatDate(row.createdAt)} · caduca el{' '}
                                    {formatDate(row.expiresAt)}
                                </span>
                            </div>

                            <div className="student-row__access">
                                <span
                                    className={`student-row__badge student-row__badge--${
                                        row.status === InvitationStatus.VALID
                                            ? 'active'
                                            : 'expired'
                                    }`}
                                >
                                    {STATUS_LABELS[row.status]}
                                </span>
                                {row.redeemedBy && (
                                    <span className="student-row__dates">
                                        {row.redeemedBy.fullName} ({row.redeemedBy.email})
                                    </span>
                                )}
                            </div>

                            <div className="student-row__actions">
                                {row.status === InvitationStatus.VALID && (
                                    <button
                                        type="button"
                                        className="btn-secondary btn-sm"
                                        onClick={() => void handleRevoke(row.id)}
                                    >
                                        Anular
                                    </button>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
};

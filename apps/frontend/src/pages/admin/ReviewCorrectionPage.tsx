import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { CorrectionGateway, AssignmentSubmission } from '../../gateways/CorrectionGateway';
import { API_URL } from '../../config';
import { VoiceReviewRecorder } from '../../components/VoiceReviewRecorder';
import { ReviewHistory } from '../../components/ReviewHistory';

/**
 * ReviewCorrectionPage — Cola de revisión por curso (flujo tipo Tinder).
 *
 * Ruta: /admin/correcciones/curso/:courseId
 *
 * En vez de revisar una submission aislada e ir y volver a la lista,
 * la profesora entra a un curso y va pasando por todas las entregas
 * pendientes una a una. Al aprobar/rechazar, la siguiente aparece
 * automáticamente. Cuando se acaban, muestra un mensaje de "¡Listo!".
 *
 * Flujo:
 *   1. Carga listPending() y filtra por courseId (client-side)
 *   2. Muestra la primera submission de la cola
 *   3. La profesora toca Aprobar/Rechazar y graba una nota de voz
 *   4. Se llama a review() → se quita de la cola → aparece la siguiente
 *   5. Cola vacía → "¡Todas revisadas!" → link a /admin/correcciones
 */

interface Props {
    gateway: CorrectionGateway;
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export const ReviewCorrectionPage: React.FC<Props> = ({ gateway }) => {
    const { courseId } = useParams<{ courseId: string }>();

    const [queue, setQueue] = useState<AssignmentSubmission[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [courseTitle, setCourseTitle] = useState('');
    // Guarda qué entrega tuvo la foto rota: al pasar a la siguiente se limpia solo.
    const [failedPhotoId, setFailedPhotoId] = useState<string | null>(null);

    useEffect(() => {
        if (!courseId) return;

        gateway.listPending()
            .then((all) => {
                const forCourse = all.filter((s) => s.lesson.course.id === courseId);
                setQueue(forCourse);
                setTotalCount(forCourse.length);
                if (forCourse.length > 0) {
                    setCourseTitle(forCourse[0].lesson.course.title);
                }
            })
            .catch(() => setError('Error al cargar las entregas.'))
            .finally(() => setIsLoading(false));
    }, [gateway, courseId]);

    const current = queue[0] ?? null;
    const currentId = current?.id;
    const reviewedCount = totalCount - queue.length;

    const photoFailed = currentId !== undefined && failedPhotoId === currentId;

    // Si falla, el error sube al grabador, que conserva el audio para reintentar.
    const handleReview = useCallback(async (action: 'approve' | 'reject', audio: Blob) => {
        if (!current) return;
        setError(null);
        await gateway.review(current.id, action, audio);
        // Quitar de la cola → la siguiente aparece automáticamente
        setQueue((prev) => prev.slice(1));
    }, [current, gateway]);

    // ── Loading ────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="admin-page">
                <Link to="/admin/correcciones" className="back-link">← Volver a Correcciones</Link>
                <p className="admin-section admin-section__status">Cargando entregas...</p>
            </div>
        );
    }

    // ── Cola vacía (todas revisadas o no había ninguna) ────────────────
    if (!current) {
        return (
            <div className="admin-page">
                <Link to="/admin/correcciones" className="back-link">← Volver a Correcciones</Link>
                <div className="review-done">
                    <div className="review-done-icon">✅</div>
                    <h2>¡Todas revisadas!</h2>
                    <p>
                        {totalCount > 0
                            ? `Revisaste ${totalCount} entrega${totalCount !== 1 ? 's' : ''} de ${courseTitle}.`
                            : 'No hay entregas pendientes en este curso.'}
                    </p>
                    <Link to="/admin/correcciones" className="btn-primary review-done__cta">
                        Volver a Correcciones
                    </Link>
                </div>
            </div>
        );
    }

    // ── Datos de la submission actual ──────────────────────────────────
    const assignmentData = current.lesson.assignmentData;
    const referenceImageUrl = assignmentData?.referenceImageUrl
        ? `${API_URL}${assignmentData.referenceImageUrl}`
        : null;
    const studentPhotoUrl = `${API_URL}${current.photoUrl}`;

    return (
        <div className="admin-page">
            <Link to="/admin/correcciones" className="back-link">← Volver a Correcciones</Link>

            <div className="admin-header">
                <h1>{courseTitle}</h1>
                <p className="review-progress">
                    Entrega {reviewedCount + 1} de {totalCount}
                    <span className="review-progress-bar">
                        <span
                            className="review-progress-fill"
                            style={{ width: `${((reviewedCount) / totalCount) * 100}%` }}
                        />
                    </span>
                </p>
            </div>

            {error && (
                <div className="alert alert-error" role="alert">
                    {error}
                </div>
            )}

            {/* Info de la alumna y lección */}
            <div className="review-meta">
                <strong>{current.student.fullName}</strong>
                <span className="review-meta__lesson"> — {current.lesson.title}</span>
                <span className="review-meta__date">
                    Enviado el {formatDate(current.submittedAt)}
                </span>
            </div>

            <div className="review-layout">
                {/* ── Columna izquierda: imágenes ─────────────────────── */}
                <div className="review-images">
                    {referenceImageUrl && (
                        <div className="review-image-block">
                            <h3>Referencia</h3>
                            <img
                                src={referenceImageUrl}
                                alt="Imagen de referencia"
                                className="review-image"
                            />
                        </div>
                    )}

                    <div className="review-image-block">
                        <h3>Entrega de la alumna</h3>
                        {photoFailed ? (
                            <p className="review-image-missing">
                                Foto no disponible
                            </p>
                        ) : (
                            <img
                                src={studentPhotoUrl}
                                alt={`Entrega de ${current.student.fullName}`}
                                className="review-image"
                                onError={() => setFailedPhotoId(current.id)}
                            />
                        )}
                    </div>
                </div>

                {/* ── Columna derecha: instrucciones + revisión por voz ── */}
                <div className="review-panel">
                    {assignmentData?.instructions && (
                        <div className="review-section">
                            <h3>Instrucciones de la tarea</h3>
                            <p className="review-instructions">{assignmentData.instructions}</p>
                        </div>
                    )}

                    <ReviewHistory
                        reviews={current.reviews}
                        gateway={gateway}
                        label="Tus revisiones anteriores de esta entrega"
                    />

                    <div className="review-section">
                        <h3>Tu revisión</h3>
                        {/* key: cada entrega nueva arranca con el grabador limpio */}
                        <VoiceReviewRecorder key={current.id} onSubmit={handleReview} />
                    </div>
                </div>
            </div>
        </div>
    );
};

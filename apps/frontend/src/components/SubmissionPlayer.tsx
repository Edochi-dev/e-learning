import React, { useState, useEffect, useRef } from 'react';
import type { CorrectionGateway, AssignmentSubmission } from '../gateways/CorrectionGateway';
import { API_URL } from '../config';

/**
 * SubmissionPlayer — Interfaz de la alumna para lecciones tipo corrección.
 *
 * Mismo rol que QuizPlayer (exámenes) y VideoPlayer (clases), pero para
 * el flujo de correcciones: la alumna sube una foto de su trabajo y
 * espera la revisión de la profesora.
 *
 * Diseño visual — dos filas apiladas, cada una con foto-izq + texto-der:
 *
 *   ┌──────────────────────────────────────────┐
 *   │ [foto ref]  │  Instrucciones             │  ← fila 1: la tarea
 *   ├──────────────────────────────────────────┤
 *   │ [foto entr] │  Estado / feedback / acción│  ← fila 2: tu entrega
 *   └──────────────────────────────────────────┘
 *
 * Cada fila usa grid con columna fija de 220px para la foto → altura
 * acotada y predecible, no depende del ancho del viewport. Con
 * align-items: start, la columna derecha no se estira al alto de la
 * imagen si su texto es corto.
 *
 * Estados posibles (derivados de submission.status):
 *   1. null (sin entrega)  → Uploader activo en fila 2
 *   2. 'pending'           → Foto + badge "En revisión"
 *   3. 'rejected'          → Foto + feedback + botón re-enviar
 *   4. 'approved'          → Foto + feedback + badge "Aprobada"
 *
 * ¿Por qué no recibe onComplete como QuizPlayer?
 *   Porque la alumna NO controla cuándo se completa la lección.
 *   La completación la dispara la profesora al aprobar.
 */

interface SubmissionPlayerProps {
    lessonId: string;
    courseId: string;
    referenceImageUrl?: string;
    instructions?: string;
    gateway: CorrectionGateway;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

const StatusBadge: React.FC<{ status: AssignmentSubmission['status'] }> = ({ status }) => {
    const config = {
        pending: { icon: '⏳', label: 'En revisión', className: 'submission-badge--pending' },
        approved: { icon: '✅', label: 'Aprobada', className: 'submission-badge--approved' },
        rejected: { icon: '📝', label: 'Correcciones', className: 'submission-badge--rejected' },
    }[status];

    return (
        <span className={`submission-badge ${config.className}`}>
            <span aria-hidden="true">{config.icon}</span>
            {config.label}
        </span>
    );
};

export const SubmissionPlayer: React.FC<SubmissionPlayerProps> = ({
    lessonId,
    courseId,
    referenceImageUrl,
    instructions,
    gateway,
}) => {
    const [submission, setSubmission] = useState<AssignmentSubmission | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [isResubmitting, setIsResubmitting] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        gateway.getMyStatus(lessonId)
            .then(setSubmission)
            .catch(() => setError('Error al cargar el estado de tu entrega.'))
            .finally(() => setIsLoading(false));
    }, [gateway, lessonId]);

    useEffect(() => {
        return () => { if (preview) URL.revokeObjectURL(preview); };
    }, [preview]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setError(null);

        if (!ALLOWED_TYPES.includes(file.type)) {
            setError('Solo se permiten imágenes (JPG, PNG, WebP, HEIC).');
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            setError('La foto no puede pesar más de 5 MB.');
            return;
        }

        if (preview) URL.revokeObjectURL(preview);
        setPreview(URL.createObjectURL(file));
    };

    const handleSubmit = async () => {
        const file = fileRef.current?.files?.[0];
        if (!file) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const result = await gateway.submit(lessonId, courseId, file);
            setSubmission(result);
            setPreview(null);
            setIsResubmitting(false);
            if (fileRef.current) fileRef.current.value = '';
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al enviar tu entrega.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="submission-player">
                <p className="submission-loading">Cargando...</p>
            </div>
        );
    }

    const refImgSrc = referenceImageUrl ? `${API_URL}${referenceImageUrl}` : null;
    const photoSrc = submission ? `${API_URL}${submission.photoUrl}` : null;
    const showUploader = !submission || isResubmitting;

    return (
        <div className="submission-player">
            {/* ── Fila 1: La tarea (referencia + instrucciones) ── */}
            <div className="submission-row">
                <div className="submission-row__media">
                    <h3>Referencia</h3>
                    {refImgSrc ? (
                        <img src={refImgSrc} alt="Imagen de referencia" className="submission-media" />
                    ) : (
                        <div className="submission-media submission-media--empty">Sin imagen</div>
                    )}
                </div>
                <div className="submission-row__content">
                    <h3>Instrucciones</h3>
                    {instructions ? (
                        <p className="submission-cell-text">{instructions}</p>
                    ) : (
                        <p className="submission-cell-empty">Sin instrucciones.</p>
                    )}
                </div>
            </div>

            {/* ── Fila 2: Tu entrega ──
                Caso especial: cuando la entrega está APROBADA, el backend
                ya borró la foto (review-correction.use-case.ts libera el
                storage). Mostrar un <img> sobre un 404 sería mala UX, así
                que approved tiene layout propio sin foto — un bloque
                verde celebratorio con el feedback. */}
            {submission?.status === 'approved' && !isResubmitting ? (
                <div className="submission-row submission-row--approved">
                    <span className="submission-approved__icon" aria-hidden="true">✅</span>
                    <h3>¡Aprobada!</h3>
                    <p className="submission-cell-text submission-cell-text--success">
                        Tu entrega fue aprobada. Esta lección quedó completada.
                    </p>
                    {submission.feedback && (
                        <div className="submission-feedback">
                            <strong>Feedback de la profesora</strong>
                            <p>{submission.feedback}</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="submission-row">
                    <div className="submission-row__media">
                        <h3>Tu entrega</h3>
                        {showUploader ? (
                            <div className="submission-entry-photo">
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                                    onChange={handleFileSelect}
                                    className="submission-file-input"
                                    id="submission-file"
                                />
                                {preview ? (
                                    <>
                                        <img src={preview} alt="Vista previa" className="submission-media" />
                                        <label htmlFor="submission-file" className="submission-file-label--overlay">
                                            Cambiar
                                        </label>
                                    </>
                                ) : (
                                    <label htmlFor="submission-file" className="submission-file-dropzone">
                                        <span className="submission-file-dropzone-icon" aria-hidden="true">📷</span>
                                        <span>Seleccionar foto</span>
                                        <span className="submission-file-dropzone-hint">JPG · PNG · WebP · HEIC · máx 5 MB</span>
                                    </label>
                                )}
                            </div>
                        ) : (
                            photoSrc && <img src={photoSrc} alt="Tu entrega" className="submission-media" />
                        )}
                    </div>

                    <div className="submission-row__content">
                        {showUploader && (
                            <>
                                <h3>{submission ? 'Nueva entrega' : 'Envía tu trabajo'}</h3>
                                <p className="submission-cell-text">
                                    Toma una foto de tu trabajo con buena iluminación. La profesora te dará feedback.
                                </p>
                                {error && <p className="submission-error">{error}</p>}
                                <div className="submission-cell-actions">
                                    <button
                                        className="btn-primary submission-entry-btn"
                                        disabled={!preview || isSubmitting}
                                        onClick={handleSubmit}
                                    >
                                        {isSubmitting ? 'Enviando...' : submission ? 'Enviar nueva entrega' : 'Enviar entrega'}
                                    </button>
                                    {isResubmitting && (
                                        <button
                                            type="button"
                                            className="btn-secondary submission-entry-btn"
                                            onClick={() => {
                                                setIsResubmitting(false);
                                                setPreview(null);
                                                setError(null);
                                                if (fileRef.current) fileRef.current.value = '';
                                            }}
                                        >
                                            Cancelar
                                        </button>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Badge del estado arriba del mensaje/feedback —
                            solo en pending/rejected (approved tiene su layout). */}
                        {!showUploader && submission && (
                            <StatusBadge status={submission.status} />
                        )}

                        {!showUploader && submission?.status === 'pending' && (
                            <p className="submission-cell-text">
                                Tu entrega está en manos de la profesora. Te notificaremos por email cuando tenga feedback.
                            </p>
                        )}

                        {!showUploader && submission?.status === 'rejected' && (
                            <>
                                {submission.feedback ? (
                                    <div className="submission-feedback">
                                        <strong>Feedback de la profesora</strong>
                                        <p>{submission.feedback}</p>
                                    </div>
                                ) : (
                                    <p className="submission-cell-text">La profesora pidió que re-envíes tu entrega.</p>
                                )}
                                <div className="submission-cell-actions">
                                    <button
                                        className="btn-primary submission-entry-btn"
                                        onClick={() => setIsResubmitting(true)}
                                    >
                                        Enviar de nuevo
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

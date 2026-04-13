import React, { useState, useEffect, useRef } from 'react';
import type { CorrectionGateway, AssignmentSubmission } from '../gateways/CorrectionGateway';
import { API_URL } from '../config';

/**
 * SubmissionPlayer — Interfaz de la alumna para las lecciones tipo corrección.
 *
 * Mismo rol que QuizPlayer (exámenes) y VideoPlayer (clases), pero para
 * el flujo de correcciones: la alumna sube una foto de su trabajo y
 * espera la revisión de la profesora.
 *
 * Cuatro estados posibles (derivados del campo `status` de la submission):
 *
 *   1. null (sin entrega)  → Instrucciones + imagen de referencia + upload
 *   2. 'pending'           → "Esperando revisión"
 *   3. 'rejected'          → Feedback de la profesora + botón re-enviar
 *   4. 'approved'          → Feedback + mensaje de éxito (lección completa)
 *
 * ¿Por qué no recibe onComplete como QuizPlayer?
 *   Porque la alumna NO controla cuándo se completa la lección.
 *   La completación la dispara la profesora al aprobar (ReviewCorrectionUseCase).
 *   El SubmissionPlayer solo refleja el estado actual — no lo cambia.
 *
 * Props:
 *   - lessonId, courseId: identifican la lección
 *   - referenceImageUrl: foto de referencia que subió la profesora
 *   - instructions: texto con las instrucciones del ejercicio
 *   - gateway: CorrectionGateway para submit y getMyStatus
 */

interface SubmissionPlayerProps {
    lessonId: string;
    courseId: string;
    referenceImageUrl?: string;
    instructions?: string;
    gateway: CorrectionGateway;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

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
    const fileRef = useRef<HTMLInputElement>(null);

    // Cargar estado actual de la submission al montar
    useEffect(() => {
        gateway.getMyStatus(lessonId)
            .then(setSubmission)
            .catch(() => setError('Error al cargar el estado de tu entrega.'))
            .finally(() => setIsLoading(false));
    }, [gateway, lessonId]);

    // Limpiar preview URL al desmontar
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
            if (fileRef.current) fileRef.current.value = '';
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al enviar tu entrega.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResubmit = () => {
        // Volver al estado de upload manteniendo la submission para que
        // si cancela, siga viendo el estado rejected
        setSubmission(null);
    };

    if (isLoading) {
        return <div className="submission-player"><p className="submission-loading">Cargando...</p></div>;
    }

    const refImgSrc = referenceImageUrl ? `${API_URL}${referenceImageUrl}` : null;

    // ── Estado: APROBADA ───────────────────────────────────────────────
    if (submission?.status === 'approved') {
        return (
            <div className="submission-player">
                <div className="submission-result submission-result--approved">
                    <div className="submission-result-icon">✅</div>
                    <h3>¡Aprobada!</h3>
                    <p>Tu entrega fue aprobada por la profesora.</p>
                    {submission.feedback && (
                        <div className="submission-feedback">
                            <strong>Feedback:</strong>
                            <p>{submission.feedback}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ── Estado: PENDIENTE ──────────────────────────────────────────────
    if (submission?.status === 'pending') {
        return (
            <div className="submission-player">
                <div className="submission-result submission-result--pending">
                    <div className="submission-result-icon">⏳</div>
                    <h3>Esperando revisión</h3>
                    <p>Tu entrega está siendo revisada por la profesora. Te notificaremos cuando tenga feedback.</p>
                </div>
            </div>
        );
    }

    // ── Estado: RECHAZADA ──────────────────────────────────────────────
    if (submission?.status === 'rejected') {
        return (
            <div className="submission-player">
                <div className="submission-result submission-result--rejected">
                    <div className="submission-result-icon">📝</div>
                    <h3>Necesita correcciones</h3>
                    {submission.feedback && (
                        <div className="submission-feedback">
                            <strong>Feedback de la profesora:</strong>
                            <p>{submission.feedback}</p>
                        </div>
                    )}
                    <button className="btn-primary" onClick={handleResubmit} style={{ marginTop: '1rem' }}>
                        Enviar de nuevo
                    </button>
                </div>
            </div>
        );
    }

    // ── Estado: SIN ENTREGA (formulario de upload) ─────────────────────
    return (
        <div className="submission-player">
            {/* Referencia e instrucciones */}
            <div className="submission-assignment">
                {refImgSrc && (
                    <div className="submission-reference">
                        <h3>Referencia</h3>
                        <img src={refImgSrc} alt="Imagen de referencia" className="submission-reference-img" />
                    </div>
                )}
                {instructions && (
                    <div className="submission-instructions">
                        <h3>Instrucciones</h3>
                        <p>{instructions}</p>
                    </div>
                )}
            </div>

            {/* Upload */}
            <div className="submission-upload">
                <h3>Sube tu trabajo</h3>
                <p className="submission-upload-hint">
                    Toma una foto de tu trabajo con buena iluminación. Formatos: JPG, PNG, WebP o HEIC. Máximo 5 MB.
                </p>

                <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                    onChange={handleFileSelect}
                    className="submission-file-input"
                    id="submission-file"
                />
                <label htmlFor="submission-file" className="submission-file-label">
                    {preview ? 'Cambiar foto' : 'Seleccionar foto'}
                </label>

                {preview && (
                    <div className="submission-preview">
                        <img src={preview} alt="Vista previa de tu entrega" className="submission-preview-img" />
                    </div>
                )}

                {error && (
                    <p className="submission-error">{error}</p>
                )}

                <button
                    className="btn-primary"
                    disabled={!preview || isSubmitting}
                    onClick={handleSubmit}
                    style={{ width: '100%', marginTop: '0.75rem' }}
                >
                    {isSubmitting ? 'Enviando...' : 'Enviar entrega'}
                </button>
            </div>
        </div>
    );
};

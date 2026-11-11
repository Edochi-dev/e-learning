import React, { useState } from 'react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { formatSeconds, MAX_REVIEW_SECONDS } from '../lib/audio-recording';

type ReviewAction = 'approve' | 'reject';

interface VoiceReviewRecorderProps {
    /** Envía la revisión; si falla, el componente conserva la grabación. */
    onSubmit: (action: ReviewAction, audio: Blob) => Promise<void>;
}

const ACTION_LABEL: Record<ReviewAction, string> = {
    approve: 'Aprobando',
    reject: 'Pidiendo correcciones',
};

/**
 * Revisión por voz: la profesora toca Aprobar o Rechazar y empieza a hablar.
 * Puede escuchar lo que grabó, regrabar o enviar. Pensado para el teléfono:
 * botones grandes y una sola acción principal por paso.
 */
export const VoiceReviewRecorder: React.FC<VoiceReviewRecorderProps> = ({ onSubmit }) => {
    const recorder = useAudioRecorder(MAX_REVIEW_SECONDS);
    const [action, setAction] = useState<ReviewAction | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);

    const begin = async (chosen: ReviewAction) => {
        setAction(chosen);
        setSendError(null);
        await recorder.start();
    };

    const cancel = () => {
        recorder.reset();
        setAction(null);
        setSendError(null);
    };

    const send = async () => {
        if (!action || !recorder.recording) return;
        setIsSending(true);
        setSendError(null);
        try {
            await onSubmit(action, recorder.recording.blob);
            recorder.reset();
            setAction(null);
        } catch (err) {
            setSendError(err instanceof Error ? err.message : 'No se pudo enviar la revisión.');
        } finally {
            setIsSending(false);
        }
    };

    const reachedLimit = recorder.elapsedSeconds >= MAX_REVIEW_SECONDS;

    if (recorder.status === 'idle' || !action) {
        return (
            <div className="voice-review">
                <p className="voice-review__hint">
                    Elige tu decisión y cuéntale a la alumna qué viste. Máximo {MAX_REVIEW_SECONDS / 60} minutos.
                </p>
                {recorder.error && <p className="voice-review__error">{recorder.error}</p>}
                <div className="review-actions">
                    <button type="button" className="btn-danger review-actions__btn" onClick={() => begin('reject')}>
                        🎙 Rechazar
                    </button>
                    <button type="button" className="btn-success review-actions__btn" onClick={() => begin('approve')}>
                        🎙 Aprobar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`voice-review voice-review--${action}`}>
            <p className="voice-review__decision">{ACTION_LABEL[action]}</p>

            {(recorder.status === 'starting' || recorder.status === 'recording') && (
                <>
                    <div className="voice-review__live" role="status">
                        <span className="voice-review__dot" aria-hidden="true" />
                        <span>{recorder.status === 'starting' ? 'Activando micrófono…' : 'Grabando'}</span>
                        <span className="voice-review__timer">
                            {formatSeconds(recorder.elapsedSeconds)} / {formatSeconds(MAX_REVIEW_SECONDS)}
                        </span>
                    </div>
                    <div className="voice-review__progress" aria-hidden="true">
                        <span style={{ width: `${(recorder.elapsedSeconds / MAX_REVIEW_SECONDS) * 100}%` }} />
                    </div>
                    <div className="voice-review__buttons">
                        <button type="button" className="btn-secondary" onClick={cancel}>
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className="btn-primary"
                            onClick={recorder.stop}
                            disabled={recorder.status !== 'recording'}
                        >
                            ■ Detener
                        </button>
                    </div>
                </>
            )}

            {recorder.status === 'recorded' && recorder.recording && (
                <>
                    {reachedLimit && (
                        <p className="voice-review__hint">Llegaste al máximo de {MAX_REVIEW_SECONDS / 60} minutos.</p>
                    )}
                    <audio className="voice-review__preview" src={recorder.recording.url} controls />
                    {sendError && <p className="voice-review__error">{sendError}</p>}
                    <div className="voice-review__buttons">
                        <button type="button" className="btn-secondary" onClick={() => begin(action)} disabled={isSending}>
                            Regrabar
                        </button>
                        <button type="button" className="btn-primary" onClick={send} disabled={isSending}>
                            {isSending ? 'Enviando…' : 'Enviar revisión'}
                        </button>
                    </div>
                    <button type="button" className="voice-review__cancel" onClick={cancel} disabled={isSending}>
                        Cambiar decisión
                    </button>
                </>
            )}
        </div>
    );
};

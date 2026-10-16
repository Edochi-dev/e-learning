import React, { useEffect, useState } from 'react';
import type { CorrectionGateway, CorrectionReview } from '../gateways/CorrectionGateway';
import { formatSeconds } from '../lib/audio-recording';
import { isTranscriptInProgress } from '../lib/transcript';

interface ReviewAudioPlayerProps {
    review: CorrectionReview;
    gateway: CorrectionGateway;
}

const expiryFormat: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };

/**
 * La nota de voz de una revisión. El audio se descarga recién cuando la alumna
 * toca "Escuchar", y la transcripción va plegada debajo: está para quien la
 * quiera leer, no en primer plano.
 *
 * Revisiones antiguas (sin audio ni vencimiento) muestran su comentario escrito.
 */
export const ReviewAudioPlayer: React.FC<ReviewAudioPlayerProps> = ({ review, gateway }) => {
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => () => {
        if (audioUrl) URL.revokeObjectURL(audioUrl);
    }, [audioUrl]);

    const isLegacyText = !review.hasAudio && !review.audioExpiresAt;
    const hasTranscript = review.transcriptStatus === 'done' && !!review.transcript;

    if (isLegacyText) {
        return review.transcript ? (
            <p className="review-audio__legacy-text">{review.transcript}</p>
        ) : null;
    }

    const handlePlay = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const blob = await gateway.getReviewAudio(review.id);
            setAudioUrl(URL.createObjectURL(blob));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No pudimos cargar el audio.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="review-audio">
            {review.hasAudio ? (
                audioUrl ? (
                    <audio className="review-audio__player" src={audioUrl} controls autoPlay />
                ) : (
                    <button
                        type="button"
                        className="review-audio__play"
                        onClick={handlePlay}
                        disabled={isLoading}
                    >
                        <span className="review-audio__play-icon" aria-hidden="true">▶</span>
                        <span>{isLoading ? 'Cargando…' : 'Escuchar a tu profesora'}</span>
                        {review.audioDurationSeconds !== null && (
                            <span className="review-audio__duration">
                                {formatSeconds(review.audioDurationSeconds)}
                            </span>
                        )}
                    </button>
                )
            ) : (
                <p className="review-audio__note">Este audio ya no está disponible.</p>
            )}

            {error && <p className="review-audio__error">{error}</p>}

            {review.hasAudio && review.audioExpiresAt && (
                <p className="review-audio__note">
                    Disponible hasta el{' '}
                    {new Date(review.audioExpiresAt).toLocaleDateString('es', expiryFormat)}
                </p>
            )}

            {isTranscriptInProgress(review) && (
                <p className="review-audio__transcribing" role="status">
                    <span className="review-audio__spinner" aria-hidden="true" />
                    Preparando la transcripción…
                </p>
            )}

            {review.transcriptStatus === 'failed' && (
                <p className="review-audio__note">No pudimos generar la transcripción de este audio.</p>
            )}

            {hasTranscript && (
                <details className="review-audio__transcript">
                    <summary>Ver transcripción</summary>
                    <p>{review.transcript}</p>
                    <small>Transcripción automática: si algo no coincide, manda el audio.</small>
                </details>
            )}
        </div>
    );
};

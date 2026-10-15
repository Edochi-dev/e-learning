import React from 'react';
import type { CorrectionGateway, CorrectionReview } from '../gateways/CorrectionGateway';
import { ReviewAudioPlayer } from './ReviewAudioPlayer';

interface ReviewHistoryProps {
    reviews: CorrectionReview[];
    gateway: CorrectionGateway;
    /** Texto del desplegable; por defecto "Revisiones anteriores". */
    label?: string;
}

const dateFormat: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };

/** Revisiones pasadas de una entrega, plegadas para no competir con la actual. */
export const ReviewHistory: React.FC<ReviewHistoryProps> = ({
    reviews,
    gateway,
    label = 'Revisiones anteriores',
}) => {
    if (reviews.length === 0) return null;

    return (
        <details className="review-history">
            <summary>{label} ({reviews.length})</summary>
            <ol className="review-history__list">
                {reviews.map((review) => (
                    <li key={review.id} className="review-history__item">
                        <div className="review-history__meta">
                            <span className={`review-history__decision review-history__decision--${review.decision}`}>
                                {review.decision === 'approved' ? 'Aprobada' : 'Con correcciones'}
                            </span>
                            <span>{new Date(review.reviewedAt).toLocaleDateString('es', dateFormat)}</span>
                        </div>
                        <ReviewAudioPlayer review={review} gateway={gateway} />
                    </li>
                ))}
            </ol>
        </details>
    );
};

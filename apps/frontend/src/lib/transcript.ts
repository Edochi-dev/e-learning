import type { CorrectionReview } from '../gateways/CorrectionGateway';

/** El servidor todavía está generando el texto de esta revisión. */
export function isTranscriptInProgress(review: CorrectionReview): boolean {
    return review.transcriptStatus === 'pending' || review.transcriptStatus === 'processing';
}

export function hasTranscriptInProgress(reviews: CorrectionReview[] | undefined): boolean {
    return (reviews ?? []).some(isTranscriptInProgress);
}

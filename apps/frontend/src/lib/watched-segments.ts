import { WATCH_SEGMENTS } from '@maris-nails/shared';

/** Fracción de un segmento que debe haberse reproducido para que cuente. */
const MIN_COVERAGE = 0.9;

/**
 * Segmentos (0..WATCH_SEGMENTS-1) realmente reproducidos, a partir de los
 * rangos `played` del propio elemento de video: el navegador deja fuera los
 * saltos y funcionan a cualquier velocidad de reproducción.
 */
export function playedSegments(played: TimeRanges, duration: number): number[] {
    if (!Number.isFinite(duration) || duration <= 0) return [];
    const size = duration / WATCH_SEGMENTS;
    const segments: number[] = [];
    for (let i = 0; i < WATCH_SEGMENTS; i++) {
        const from = i * size;
        const to = from + size;
        let covered = 0;
        for (let r = 0; r < played.length; r++) {
            covered += Math.max(0, Math.min(to, played.end(r)) - Math.max(from, played.start(r)));
        }
        if (covered >= size * MIN_COVERAGE) segments.push(i);
    }
    return segments;
}

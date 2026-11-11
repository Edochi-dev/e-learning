import { LIVE_JOIN_LEAD_MINUTES } from '@maris-nails/shared';

export type LiveClassPhase = 'upcoming' | 'open' | 'ended';

/** The academy's own clock, shown next to the student's for reference. */
export const ACADEMY_TIME_ZONE = 'America/Santiago';

export function liveClassPhase(startsAt: Date, endsAt: Date, now: Date): LiveClassPhase {
    if (now >= endsAt) return 'ended';
    const opensAt = startsAt.getTime() - LIVE_JOIN_LEAD_MINUTES * 60_000;
    return now.getTime() >= opensAt ? 'open' : 'upcoming';
}

/**
 * Label for an open class: the room opens LIVE_JOIN_LEAD_MINUTES early, but
 * until the start time it is not live yet and must not say so.
 */
export function openClassLabel(startsAt: Date, now: Date): string {
    return now < startsAt
        ? `Empieza en ${formatCountdown(startsAt.getTime() - now.getTime())} · ya puedes entrar`
        : '🔴 En vivo ahora';
}

/** "3 d 4 h", "2 h 05 min", "12:07" (under an hour, with seconds). */
export function formatCountdown(ms: number): string {
    const total = Math.max(0, Math.floor(ms / 1000));
    const days = Math.floor(total / 86_400);
    const hours = Math.floor((total % 86_400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    const pad = (n: number) => String(n).padStart(2, '0');

    if (days > 0) return `${days} d ${hours} h`;
    if (hours > 0) return `${hours} h ${pad(minutes)} min`;
    return `${pad(minutes)}:${pad(seconds)}`;
}

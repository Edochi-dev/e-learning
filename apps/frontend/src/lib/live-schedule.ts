import { localInputToIso, toLocalInputValue } from './local-datetime';

/** A stream has no fixed end; this estimate feeds calendars and the agenda. */
export const DEFAULT_LIVE_DURATION_MINUTES = 120;

export const LIVE_DURATION_OPTIONS = [30, 60, 90, 120, 150, 180, 240];

/** Local "YYYY-MM-DDTHH:MM" start + minutes → local end value. */
export function addMinutesToLocalInput(start: string, minutes: number): string {
    const end = new Date(new Date(localInputToIso(start)).getTime() + minutes * 60_000);
    return toLocalInputValue(end.toISOString());
}

/** Minutes between two local values, or the default when either is missing. */
export function durationBetween(start?: string, end?: string): number {
    if (!start || !end) return DEFAULT_LIVE_DURATION_MINUTES;
    const minutes = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000);
    return minutes > 0 ? minutes : DEFAULT_LIVE_DURATION_MINUTES;
}

export function formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} min`;
    return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

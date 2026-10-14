import { LIVE_JOIN_LEAD_MINUTES } from '@maris-nails/shared';

export type LiveClassPhase = 'upcoming' | 'open' | 'ended';

/** The academy's own clock, shown next to the student's for reference. */
export const ACADEMY_TIME_ZONE = 'America/Santiago';

export function liveClassPhase(startsAt: Date, endsAt: Date, now: Date): LiveClassPhase {
    if (now >= endsAt) return 'ended';
    const opensAt = startsAt.getTime() - LIVE_JOIN_LEAD_MINUTES * 60_000;
    return now.getTime() >= opensAt ? 'open' : 'upcoming';
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

export interface CalendarEvent {
    id: string;
    title: string;
    description: string;
    url: string;
    startsAt: Date;
    endsAt: Date;
}

/** 2030-03-01T22:00:00.000Z → 20300301T220000Z (iCalendar / Google format). */
function toCalendarUtc(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function googleCalendarUrl(event: CalendarEvent): string {
    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: event.title,
        dates: `${toCalendarUtc(event.startsAt)}/${toCalendarUtc(event.endsAt)}`,
        details: `${event.description}\n\n${event.url}`,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function escapeIcsText(text: string): string {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;');
}

/**
 * An .ics file the phone imports into its own calendar, which then reminds
 * the student 30 minutes before: no push permission or email needed.
 */
export function buildIcs(event: CalendarEvent, now: Date = new Date()): string {
    return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Maris Nails Academy//Clases en vivo//ES',
        'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT',
        `UID:${event.id}@marisnails.academy`,
        `DTSTAMP:${toCalendarUtc(now)}`,
        `DTSTART:${toCalendarUtc(event.startsAt)}`,
        `DTEND:${toCalendarUtc(event.endsAt)}`,
        `SUMMARY:${escapeIcsText(event.title)}`,
        `DESCRIPTION:${escapeIcsText(event.description)}`,
        `URL:${event.url}`,
        'BEGIN:VALARM',
        'TRIGGER:-PT30M',
        'ACTION:DISPLAY',
        `DESCRIPTION:${escapeIcsText(event.title)}`,
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR',
    ].join('\r\n');
}

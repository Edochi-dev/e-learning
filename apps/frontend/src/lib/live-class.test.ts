import { describe, it, expect } from 'vitest';
import { buildIcs, formatCountdown, googleCalendarUrl, liveClassPhase } from './live-class';

const start = new Date('2030-03-01T22:00:00.000Z');
const end = new Date('2030-03-01T23:30:00.000Z');
const at = (iso: string) => new Date(iso);

describe('liveClassPhase', () => {
    it('falta más de 15 minutos: próxima', () => {
        expect(liveClassPhase(start, end, at('2030-03-01T21:44:59Z'))).toBe('upcoming');
    });

    it('desde 15 minutos antes y durante la clase: abierta', () => {
        expect(liveClassPhase(start, end, at('2030-03-01T21:45:00Z'))).toBe('open');
        expect(liveClassPhase(start, end, at('2030-03-01T23:29:59Z'))).toBe('open');
    });

    it('desde la hora de término: terminada', () => {
        expect(liveClassPhase(start, end, at('2030-03-01T23:30:00Z'))).toBe('ended');
    });
});

describe('formatCountdown', () => {
    it.each([
        [3 * 86_400_000 + 4 * 3_600_000 + 59_000, '3 d 4 h'],
        [2 * 3_600_000 + 5 * 60_000, '2 h 05 min'],
        [12 * 60_000 + 7_000, '12:07'],
        [-5_000, '00:00'],
    ])('%i ms → %s', (ms, text) => expect(formatCountdown(ms)).toBe(text));
});

const event = {
    id: 'lesson-1',
    title: 'Clase en vivo: acrílico, parte 2',
    description: 'Maris Nails Academy; trae tus materiales',
    url: 'https://marisnails.academy/mis-cursos/c1?leccion=lesson-1',
    startsAt: start,
    endsAt: end,
};

describe('googleCalendarUrl', () => {
    it('prellena título, horario en UTC y enlace a la clase', () => {
        const url = new URL(googleCalendarUrl(event));
        expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render');
        expect(url.searchParams.get('dates')).toBe('20300301T220000Z/20300301T233000Z');
        expect(url.searchParams.get('text')).toBe(event.title);
        expect(url.searchParams.get('details')).toContain(event.url);
    });
});

describe('buildIcs', () => {
    const ics = buildIcs(event, at('2030-02-01T12:00:00Z'));

    it('es un evento válido con horario en UTC y aviso 30 minutos antes', () => {
        const lines = ics.split('\r\n');
        expect(lines[0]).toBe('BEGIN:VCALENDAR');
        expect(lines).toContain('DTSTART:20300301T220000Z');
        expect(lines).toContain('DTEND:20300301T233000Z');
        expect(lines).toContain('UID:lesson-1@marisnails.academy');
        expect(lines).toContain('TRIGGER:-PT30M');
        expect(lines.at(-1)).toBe('END:VCALENDAR');
    });

    it('escapa comas y punto y coma del texto', () => {
        expect(ics).toContain('SUMMARY:Clase en vivo: acrílico\\, parte 2');
        expect(ics).toContain('DESCRIPTION:Maris Nails Academy\\; trae tus materiales');
    });
});

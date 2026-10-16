import { describe, it, expect } from 'vitest';
import { formatCountdown, liveClassPhase, openClassLabel } from './live-class';

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

describe('openClassLabel', () => {
    const startsAt = new Date('2030-03-01T22:00:00Z');

    it('antes de la hora no dice "en vivo": la sala abre antes que la clase', () => {
        expect(openClassLabel(startsAt, new Date('2030-03-01T21:50:00Z'))).toBe('Empieza en 10:00 · ya puedes entrar');
    });

    it('desde la hora de inicio, está en vivo', () => {
        expect(openClassLabel(startsAt, new Date('2030-03-01T22:00:00Z'))).toBe('🔴 En vivo ahora');
    });
});

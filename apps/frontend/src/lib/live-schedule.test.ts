import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
    DEFAULT_LIVE_DURATION_MINUTES,
    addMinutesToLocalInput,
    durationBetween,
    formatDuration,
} from './live-schedule';

describe('live-schedule', () => {
    const originalTz = process.env.TZ;
    beforeAll(() => { process.env.TZ = 'America/Santiago'; });
    afterAll(() => { process.env.TZ = originalTz; });

    it('calcula el fin estimado a partir del inicio y la duración', () => {
        expect(addMinutesToLocalInput('2026-10-20T19:00', 120)).toBe('2026-10-20T21:00');
        expect(addMinutesToLocalInput('2026-10-20T23:30', 90)).toBe('2026-10-21T01:00');
    });

    it('recupera la duración de una clase ya guardada', () => {
        expect(durationBetween('2026-10-20T19:00', '2026-10-20T20:30')).toBe(90);
    });

    it('usa la duración por defecto si falta un extremo o el rango es inválido', () => {
        expect(durationBetween('2026-10-20T19:00', '')).toBe(DEFAULT_LIVE_DURATION_MINUTES);
        expect(durationBetween('2026-10-20T19:00', '2026-10-20T18:00')).toBe(DEFAULT_LIVE_DURATION_MINUTES);
    });

    it.each([
        [30, '30 min'],
        [60, '1 h'],
        [150, '2 h 30 min'],
    ])('%i minutos se muestran como %s', (minutes, text) => expect(formatDuration(minutes)).toBe(text));
});

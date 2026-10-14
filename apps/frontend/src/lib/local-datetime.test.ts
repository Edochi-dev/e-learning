import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { localInputToIso, toLocalInputValue, withLiveInstants } from './local-datetime';

describe('local-datetime (navegador en Santiago, UTC-3 en octubre)', () => {
    const originalTz = process.env.TZ;
    beforeAll(() => { process.env.TZ = 'America/Santiago'; });
    afterAll(() => { process.env.TZ = originalTz; });

    it('la hora que escribe la profe se envía como el instante correcto', () => {
        expect(localInputToIso('2026-10-20T19:00')).toBe('2026-10-20T22:00:00.000Z');
    });

    it('al editar, un instante se muestra en su hora local (no en UTC)', () => {
        expect(toLocalInputValue('2026-10-20T22:00:00.000Z')).toBe('2026-10-20T19:00');
    });

    it('ida y vuelta sin correrse', () => {
        expect(toLocalInputValue(localInputToIso('2026-12-31T23:30'))).toBe('2026-12-31T23:30');
    });

    it('withLiveInstants convierte solo los campos presentes', () => {
        expect(withLiveInstants({ title: 'x', liveStartsAt: '2026-10-20T19:00', liveEndsAt: '' })).toEqual({
            title: 'x',
            liveStartsAt: '2026-10-20T22:00:00.000Z',
            liveEndsAt: '',
        });
    });
});

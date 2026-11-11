import { describe, it, expect } from 'vitest';
import { playedSegments } from './watched-segments';

const ranges = (...pairs: [number, number][]): TimeRanges => ({
    length: pairs.length,
    start: (i: number) => pairs[i][0],
    end: (i: number) => pairs[i][1],
});

describe('playedSegments', () => {
    it('cuenta solo lo reproducido: un salto no suma lo que se saltó', () => {
        // Video de 100 s: vio 0–10 s, saltó, vio 90–100 s.
        expect(playedSegments(ranges([0, 10], [90, 100]), 100)).toEqual([
            0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99,
        ]);
    });

    it('no cuenta un segmento visto a medias', () => {
        // Segmento 0 = 0–2 s; solo vio 0–1 s.
        expect(playedSegments(ranges([0, 1]), 200)).toEqual([]);
    });

    it('suma rangos que cubren un mismo segmento por partes', () => {
        expect(playedSegments(ranges([0, 1], [1, 2]), 200)).toEqual([0]);
    });

    it('sin duración conocida (en vivo, aún cargando) no informa nada', () => {
        expect(playedSegments(ranges([0, 50]), Infinity)).toEqual([]);
        expect(playedSegments(ranges([0, 50]), NaN)).toEqual([]);
    });
});

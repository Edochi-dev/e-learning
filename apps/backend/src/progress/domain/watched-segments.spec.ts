import { toSegmentBits, WATCH_SEGMENTS } from './watched-segments';
import { completesByWatching } from './watch-completion-policy';

describe('toSegmentBits', () => {
  it('marca solo los segmentos vistos, en su posición', () => {
    const bits = toSegmentBits([0, 2, 99]);

    expect(bits).toHaveLength(WATCH_SEGMENTS);
    expect(bits[0]).toBe('1');
    expect(bits[1]).toBe('0');
    expect(bits[2]).toBe('1');
    expect(bits[99]).toBe('1');
  });

  it('ignora índices fuera de rango o no enteros', () => {
    expect(toSegmentBits([-1, 100, 1.5])).toBe('0'.repeat(WATCH_SEGMENTS));
  });
});

describe('completesByWatching', () => {
  it('completa desde el 95%', () => {
    expect(completesByWatching(94)).toBe(false);
    expect(completesByWatching(95)).toBe(true);
    expect(completesByWatching(100)).toBe(true);
  });
});

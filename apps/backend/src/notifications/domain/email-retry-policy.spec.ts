import { EmailRetryPolicy } from './email-retry-policy';

describe('EmailRetryPolicy', () => {
  const MINUTE = 60_000;
  const policy = new EmailRetryPolicy();
  const now = new Date('2026-10-15T12:00:00Z');

  it('doubles the delay after each failed attempt', () => {
    expect([1, 2, 3, 4, 5, 6].map((n) => policy.delayAfter(n))).toEqual([
      1 * MINUTE,
      2 * MINUTE,
      4 * MINUTE,
      8 * MINUTE,
      16 * MINUTE,
      32 * MINUTE,
    ]);
  });

  it('caps the delay at one hour', () => {
    expect(policy.delayAfter(7)).toBe(60 * MINUTE);
    expect(policy.delayAfter(30)).toBe(60 * MINUTE);
  });

  it('schedules a retry while attempts remain', () => {
    expect(policy.decide(3, now)).toEqual({
      kind: 'retry',
      nextAttemptAt: new Date(now.getTime() + 4 * MINUTE),
    });
  });

  it('gives up once the last allowed attempt has failed', () => {
    expect(policy.decide(policy.maxAttempts, now)).toEqual({
      kind: 'give-up',
    });
  });

  it('honours custom limits', () => {
    const strict = new EmailRetryPolicy(2, 1000, 1500);
    expect(strict.decide(1, now)).toEqual({
      kind: 'retry',
      nextAttemptAt: new Date(now.getTime() + 1000),
    });
    expect(strict.delayAfter(2)).toBe(1500);
    expect(strict.decide(2, now)).toEqual({ kind: 'give-up' });
  });
});

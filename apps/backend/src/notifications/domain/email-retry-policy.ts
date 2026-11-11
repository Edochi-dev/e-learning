export type RetryDecision =
  | { kind: 'retry'; nextAttemptAt: Date }
  | { kind: 'give-up' };

/**
 * Exponential backoff for failed deliveries: 1, 2, 4 … minutes, capped at one
 * hour. With the defaults the last of 8 attempts happens ~2 h after the first,
 * long enough to ride out an outage of both providers.
 */
export class EmailRetryPolicy {
  constructor(
    readonly maxAttempts = 8,
    private readonly baseDelayMs = 60_000,
    private readonly maxDelayMs = 60 * 60_000,
  ) {}

  /** `attempts` counts the attempt that just failed. */
  decide(attempts: number, now: Date = new Date()): RetryDecision {
    if (attempts >= this.maxAttempts) return { kind: 'give-up' };
    return {
      kind: 'retry',
      nextAttemptAt: new Date(now.getTime() + this.delayAfter(attempts)),
    };
  }

  delayAfter(attempts: number): number {
    const exponent = Math.max(attempts - 1, 0);
    return Math.min(this.baseDelayMs * 2 ** exponent, this.maxDelayMs);
  }
}

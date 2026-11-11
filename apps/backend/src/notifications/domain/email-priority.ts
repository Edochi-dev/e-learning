/**
 * Lower values leave the outbox first. Account emails (password reset) must
 * never wait behind a batch of reminders.
 */
export const EmailPriority = {
  HIGH: 0,
  NORMAL: 1,
  LOW: 2,
} as const;

export type EmailPriority = (typeof EmailPriority)[keyof typeof EmailPriority];

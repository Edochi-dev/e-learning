export const EmailOutboxStatus = {
  PENDING: 'pending',
  SENDING: 'sending',
  SENT: 'sent',
  FAILED: 'failed',
} as const;

export type EmailOutboxStatus =
  (typeof EmailOutboxStatus)[keyof typeof EmailOutboxStatus];

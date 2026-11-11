/** Kinds of admin email alerts; each admin subscribes to the ones they handle. */
export const AlertTopic = {
  PENDING_CORRECTIONS: 'pending_corrections',
  NAME_CHANGE_REQUESTS: 'name_change_requests',
} as const;

export type AlertTopic = (typeof AlertTopic)[keyof typeof AlertTopic];

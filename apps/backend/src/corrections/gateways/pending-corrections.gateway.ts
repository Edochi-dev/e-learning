/** Read-only view of the review backlog, for reminders that only need a count. */
export abstract class PendingCorrectionsGateway {
  abstract countPending(): Promise<number>;
}

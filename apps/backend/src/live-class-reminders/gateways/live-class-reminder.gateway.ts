/** Everything the reminder email needs about one student and one class. */
export interface DueLiveClassReminder {
  email: string;
  fullName: string;
  courseId: string;
  courseTitle: string;
  lessonId: string;
  lessonTitle: string;
  startsAt: Date;
}

export abstract class LiveClassReminderGateway {
  /**
   * Records as sent, and returns, the reminders for live classes starting
   * within `leadMinutes`, one per student with an active enrollment. Atomic:
   * a reminder is returned once, even to concurrent callers.
   */
  abstract claimDue(
    now: Date,
    leadMinutes: number,
  ): Promise<DueLiveClassReminder[]>;
}

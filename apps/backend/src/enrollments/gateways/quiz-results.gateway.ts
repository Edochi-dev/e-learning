/** Whether each quiz of a course was passed on its latest attempt. */
export abstract class QuizResultsGateway {
  /** lessonId → passed; quizzes never attempted are absent. */
  abstract latestResultsByCourse(
    userId: string,
    courseId: string,
  ): Promise<Record<string, boolean>>;
}

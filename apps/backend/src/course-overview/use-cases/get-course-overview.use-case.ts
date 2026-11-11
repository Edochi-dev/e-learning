import { Injectable } from '@nestjs/common';
import { LessonStatus, type CourseOverview } from '@maris-nails/shared';
import { CourseOutlineGateway } from '../../courses/gateways/course-outline.gateway';
import { LessonProgressGateway } from '../../progress/gateways/lesson-progress.gateway';
import { WatchProgressGateway } from '../../progress/gateways/watch-progress.gateway';
import { QuizResultsGateway } from '../../enrollments/gateways/quiz-results.gateway';
import { SubmissionStatusGateway } from '../../corrections/gateways/submission-status.gateway';
import { lessonStatus, nextLessonId } from '../domain/lesson-status';

/**
 * GetCourseOverviewUseCase — Estado de cada lección de un curso para una
 * alumna, en una sola respuesta: lo que necesita la portada del curso.
 *
 * NO comprueba matrícula: de eso se encarga EnrollmentGuard en la ruta.
 */
@Injectable()
export class GetCourseOverviewUseCase {
  constructor(
    private readonly outline: CourseOutlineGateway,
    private readonly lessonProgress: LessonProgressGateway,
    private readonly watchProgress: WatchProgressGateway,
    private readonly quizResults: QuizResultsGateway,
    private readonly submissions: SubmissionStatusGateway,
  ) {}

  async execute(userId: string, courseId: string): Promise<CourseOverview> {
    const [outline, completedIds, watched, quizzes, submissions] =
      await Promise.all([
        this.outline.findOutline(courseId),
        this.lessonProgress.getCompletedLessonIds(userId, courseId),
        this.watchProgress.getWatchProgressByCourse(userId, courseId),
        this.quizResults.latestResultsByCourse(userId, courseId),
        this.submissions.statusesByCourse(userId, courseId),
      ]);
    const completed = new Set(completedIds);

    const lessons = outline.map((lesson) => {
      const watchedPercent = watched[lesson.id] ?? 0;
      return {
        lessonId: lesson.id,
        watchedPercent,
        status: lessonStatus(lesson.type, {
          completed: completed.has(lesson.id),
          watchedPercent,
          quizPassed: quizzes[lesson.id],
          submission: submissions[lesson.id],
        }),
      };
    });

    const completedLessons = lessons.filter(
      (l) => l.status === LessonStatus.COMPLETED,
    ).length;
    return {
      lessons,
      completedLessons,
      totalLessons: lessons.length,
      progressPercent: lessons.length
        ? Math.round((completedLessons / lessons.length) * 100)
        : 0,
      nextLessonId: nextLessonId(lessons),
    };
  }
}

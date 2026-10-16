import { Injectable } from '@nestjs/common';
import { LessonType, type WatchProgressResult } from '@maris-nails/shared';
import { WatchProgressGateway } from '../../progress/gateways/watch-progress.gateway';
import { LessonProgressGateway } from '../../progress/gateways/lesson-progress.gateway';
import { LessonGateway } from '../../courses/gateways/lesson.gateway';
import { completesByWatching } from '../../progress/domain/watch-completion-policy';

/**
 * SaveWatchProgressUseCase — Suma los segmentos de video que la alumna vio
 * y, cuando el acumulado llega al umbral de la política, completa la lección.
 *
 * El porcentaje lo calcula el servidor a partir de los segmentos: el
 * navegador nunca dice "vi el 95%".
 *
 * NO comprueba matrícula: de eso se encarga EnrollmentGuard en la ruta.
 */
@Injectable()
export class SaveWatchProgressUseCase {
  constructor(
    private readonly watchProgressGateway: WatchProgressGateway,
    private readonly lessonProgressGateway: LessonProgressGateway,
    private readonly lessonGateway: LessonGateway,
  ) {}

  async execute(
    userId: string,
    lessonId: string,
    segments: number[],
  ): Promise<WatchProgressResult> {
    const watchedPercent =
      await this.watchProgressGateway.recordWatchedSegments(
        userId,
        lessonId,
        segments,
      );
    if (!completesByWatching(watchedPercent)) {
      return { watchedPercent, lessonCompleted: false };
    }

    // Exams and corrections have their own completion rules (passing the
    // quiz, the teacher's approval): watching never completes them.
    const lesson = await this.lessonGateway.findLesson(lessonId);
    if (lesson?.type !== LessonType.CLASS) {
      return { watchedPercent, lessonCompleted: false };
    }

    await this.lessonProgressGateway.markLessonComplete(userId, lessonId);
    return { watchedPercent, lessonCompleted: true };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentGateway } from '../gateways/enrollment.gateway';
import { LessonProgressGateway } from '../../progress/gateways/lesson-progress.gateway';
import { WatchProgressGateway } from '../../progress/gateways/watch-progress.gateway';

export interface CourseProgress {
  completedLessonIds: string[];
  watchProgress: Record<string, number>; // lessonId → percent visto
}

/**
 * GetCourseProgressUseCase — Devuelve el progreso completo de un alumno en un curso.
 *
 * Este use case es un buen ejemplo de por qué ISP no significa "solo 1 gateway":
 * necesita datos de 3 fuentes distintas, así que inyecta 3 gateways.
 * La diferencia es que cada gateway tiene UNA responsabilidad clara, no 13 métodos.
 *
 *   - EnrollmentGateway       → verificar matrícula
 *   - LessonProgressGateway   → lecciones completadas
 *   - WatchProgressGateway    → porcentaje de video visto
 */
@Injectable()
export class GetCourseProgressUseCase {
  constructor(
    private readonly enrollmentGateway: EnrollmentGateway,
    private readonly lessonProgressGateway: LessonProgressGateway,
    private readonly watchProgressGateway: WatchProgressGateway,
  ) {}

  async execute(userId: string, courseId: string): Promise<CourseProgress> {
    const enrollment = await this.enrollmentGateway.findByUserAndCourse(
      userId,
      courseId,
    );
    if (!enrollment) {
      throw new NotFoundException('No tienes matrícula activa en este curso');
    }

    const [completedLessonIds, watchProgress] = await Promise.all([
      this.lessonProgressGateway.getCompletedLessonIds(userId, courseId),
      this.watchProgressGateway.getWatchProgressByCourse(userId, courseId),
    ]);

    return { completedLessonIds, watchProgress };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentGateway } from '../gateways/enrollment.gateway';
import { WatchProgressGateway } from '../../progress/gateways/watch-progress.gateway';

/**
 * SaveWatchProgressUseCase — Guarda cuánto video ha visto el alumno.
 *
 * Depende de 2 gateways segregados:
 *   - EnrollmentGateway     → verificar matrícula (ownership)
 *   - WatchProgressGateway  → guardar el porcentaje de video
 *
 * Antes, ambas operaciones venían del mismo EnrollmentGateway (god-class).
 * Ahora este use case NO sabe que existen quizzes o compleción de lecciones.
 */
@Injectable()
export class SaveWatchProgressUseCase {
  constructor(
    private readonly enrollmentGateway: EnrollmentGateway,
    private readonly watchProgressGateway: WatchProgressGateway,
  ) {}

  async execute(
    userId: string,
    lessonId: string,
    courseId: string,
    percent: number,
  ): Promise<void> {
    // Verificamos que el usuario está matriculado antes de guardar progreso.
    // Esto impide que alguien guarde progreso en un curso que no ha comprado.
    const enrollment = await this.enrollmentGateway.findByUserAndCourse(
      userId,
      courseId,
    );
    if (!enrollment) {
      throw new NotFoundException(
        'No tienes matrícula activa en este curso',
      );
    }

    await this.watchProgressGateway.saveWatchProgress(userId, lessonId, percent);
  }
}

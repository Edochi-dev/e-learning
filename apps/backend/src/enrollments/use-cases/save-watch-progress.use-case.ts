import { Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentGateway } from '../gateways/enrollment.gateway';

@Injectable()
export class SaveWatchProgressUseCase {
  constructor(private readonly enrollmentGateway: EnrollmentGateway) {}

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

    await this.enrollmentGateway.saveWatchProgress(userId, lessonId, percent);
  }
}

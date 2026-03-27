import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EnrollmentGateway } from '../gateways/enrollment.gateway';
import { LessonProgressGateway } from '../gateways/lesson-progress.gateway';
import { LessonGateway } from '../../courses/gateways/lesson.gateway';

/**
 * MarkLessonCompleteUseCase — Marca una lección como completada por el alumno.
 *
 * Este Use Case tiene DOS responsabilidades de seguridad antes de guardar:
 *
 * 1. OWNERSHIP CHECK (línea más importante):
 *    Verificar que el usuario tiene una matrícula activa en el curso.
 *    Sin esto, cualquier usuario autenticado podría guardar progreso en
 *    cursos que no ha comprado simplemente enviando un lessonId válido.
 *
 * 2. EXISTENCIA: Verificar que la lección existe en la base de datos.
 *
 * Depende de 2 gateways segregados:
 *   - EnrollmentGateway        → verificar matrícula (ownership)
 *   - LessonProgressGateway    → marcar la lección como completada
 */
@Injectable()
export class MarkLessonCompleteUseCase {
  constructor(
    private readonly enrollmentGateway: EnrollmentGateway,
    private readonly lessonProgressGateway: LessonProgressGateway,
    private readonly lessonGateway: LessonGateway,
  ) {}

  async execute(
    userId: string,
    lessonId: string,
    courseId: string,
  ): Promise<void> {
    // Paso 1: ¿Está matriculado? (Ownership check)
    const enrollment = await this.enrollmentGateway.findByUserAndCourse(
      userId,
      courseId,
    );
    if (!enrollment) {
      throw new ForbiddenException('No estás matriculado en este curso');
    }

    // Paso 2: ¿Existe la lección?
    const lesson = await this.lessonGateway.findLesson(lessonId);
    if (!lesson) {
      throw new NotFoundException('Lección no encontrada');
    }

    // Paso 3: Marcar completa (idempotente: si ya lo estaba, no pasa nada)
    await this.lessonProgressGateway.markLessonComplete(userId, lessonId);
  }
}

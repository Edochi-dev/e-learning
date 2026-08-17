import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LessonType } from '@maris-nails/shared';
import { LessonProgressGateway } from '../../progress/gateways/lesson-progress.gateway';
import { LessonGateway } from '../../courses/gateways/lesson.gateway';

/**
 * MarkLessonCompleteUseCase — Marca una lección como completada por el alumno.
 *
 * NO comprueba matrícula: de eso se encarga EnrollmentGuard en la ruta, que
 * además valida que la lección pertenezca al curso declarado. Si algún día se
 * expone esta operación por otra vía, esa vía debe pasar por el mismo guard.
 */
@Injectable()
export class MarkLessonCompleteUseCase {
  constructor(
    private readonly lessonProgressGateway: LessonProgressGateway,
    private readonly lessonGateway: LessonGateway,
  ) {}

  async execute(userId: string, lessonId: string): Promise<void> {
    const lesson = await this.lessonGateway.findLesson(lessonId);
    if (!lesson) {
      throw new NotFoundException('Lección no encontrada');
    }

    // Las correcciones solo se completan cuando la profesora las aprueba
    // (ReviewCorrectionUseCase), nunca por acción directa de la alumna.
    if (lesson.type === LessonType.CORRECTION) {
      throw new BadRequestException(
        'Las lecciones de corrección se completan al ser aprobadas por la profesora',
      );
    }

    await this.lessonProgressGateway.markLessonComplete(userId, lessonId);
  }
}

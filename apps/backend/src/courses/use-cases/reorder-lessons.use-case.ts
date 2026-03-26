import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CourseGateway } from '../gateways/course.gateway';
import { LessonGateway } from '../gateways/lesson.gateway';

/**
 * ReorderLessonsUseCase — Caso de uso: reordenar las lecciones de un curso
 *
 * Recibe el courseId y un array de lessonIds en el nuevo orden deseado.
 * Antes de reordenar, valida que:
 *   1. El curso existe
 *   2. El array contiene exactamente las mismas lecciones que tiene el curso
 *
 * Así evitamos que el frontend mande IDs inventados o que falten lecciones.
 */
@Injectable()
export class ReorderLessonsUseCase {
  constructor(
    private readonly courseGateway: CourseGateway,
    private readonly lessonGateway: LessonGateway,
  ) {}

  async execute(courseId: string, lessonIds: string[]): Promise<void> {
    const course = await this.courseGateway.findOne(courseId);
    if (!course) {
      throw new NotFoundException(`Course with id ${courseId} not found`);
    }

    const existingIds = new Set((course.lessons ?? []).map((l) => l.id));

    for (const id of lessonIds) {
      if (!existingIds.has(id)) {
        throw new BadRequestException(
          `Lesson ${id} does not belong to this course`,
        );
      }
    }

    if (lessonIds.length !== existingIds.size) {
      throw new BadRequestException(
        'lessonIds must contain all lessons of the course',
      );
    }

    await this.lessonGateway.reorderLessons(courseId, lessonIds);
  }
}

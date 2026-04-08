import { Injectable, NotFoundException } from '@nestjs/common';
import { Course } from '../entities/course.entity';
import { CourseGateway } from '../gateways/course.gateway';
import { OrphanFileCleaner } from '../../storage/services/orphan-file-cleaner.service';

/**
 * DeleteCourseThumbnailUseCase — Elimina la miniatura de un curso.
 *
 * Bug arreglado en este refactor:
 *   Antes borraba el archivo de la thumbnail directamente, sin chequear si
 *   algún otro curso la seguía usando. Ahora delega a OrphanFileCleaner con
 *   un checker que excluye al curso actual.
 */
@Injectable()
export class DeleteCourseThumbnailUseCase {
  constructor(
    private readonly courseGateway: CourseGateway,
    private readonly orphanFileCleaner: OrphanFileCleaner,
  ) {}

  async execute(id: string): Promise<Course> {
    const course = await this.courseGateway.findOne(id);
    if (!course) throw new NotFoundException(`Curso ${id} no encontrado`);

    const oldThumbnailUrl = course.thumbnailUrl ?? null;
    if (oldThumbnailUrl) {
      await this.orphanFileCleaner.deleteIfOrphan(oldThumbnailUrl, () =>
        this.courseGateway.isThumbnailUrlReferenced(oldThumbnailUrl, id),
      );
    }

    return this.courseGateway.update(id, { thumbnailUrl: undefined });
  }
}

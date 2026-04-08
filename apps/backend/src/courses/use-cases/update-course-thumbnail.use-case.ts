import { Injectable, NotFoundException } from '@nestjs/common';
import { Course } from '../entities/course.entity';
import { CourseGateway } from '../gateways/course.gateway';
import { FileStorageGateway } from '../../storage/gateways/file-storage.gateway';
import { OrphanFileCleaner } from '../../storage/services/orphan-file-cleaner.service';

/**
 * UpdateCourseThumbnailUseCase — Reemplaza la miniatura de un curso.
 *
 * Bug arreglado en este refactor:
 *   Antes este use case borraba la thumbnail vieja sin verificar si algún OTRO
 *   curso la seguía usando. Si dos cursos compartían imagen, cambiar la portada
 *   de uno dejaba al otro con un broken link. Ahora delegamos a OrphanFileCleaner
 *   con un checker que excluye al curso actual, replicando el patrón ya usado
 *   para videos en UpdateLessonUseCase.
 */
@Injectable()
export class UpdateCourseThumbnailUseCase {
  constructor(
    private readonly courseGateway: CourseGateway,
    private readonly fileStorageGateway: FileStorageGateway,
    private readonly orphanFileCleaner: OrphanFileCleaner,
  ) {}

  async execute(id: string, file: Express.Multer.File): Promise<Course> {
    const course = await this.courseGateway.findOne(id);
    if (!course) throw new NotFoundException(`Curso ${id} no encontrado`);

    // Si ya había miniatura, evaluamos si es huérfana antes de borrarla.
    // Excluimos el curso actual del conteo: en este momento todavía aparece
    // en la DB con el thumbnailUrl viejo asignado.
    const oldThumbnailUrl = course.thumbnailUrl ?? null;
    if (oldThumbnailUrl) {
      await this.orphanFileCleaner.deleteIfOrphan(oldThumbnailUrl, () =>
        this.courseGateway.isThumbnailUrlReferenced(oldThumbnailUrl, id),
      );
    }

    const thumbnailUrl = await this.fileStorageGateway.saveFile(
      file,
      'thumbnails',
    );

    return this.courseGateway.update(id, {
      thumbnailUrl,
    } as unknown as Partial<Course>);
  }
}

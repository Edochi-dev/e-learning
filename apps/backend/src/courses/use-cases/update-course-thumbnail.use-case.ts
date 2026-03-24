import { Injectable, NotFoundException } from '@nestjs/common';
import { Course } from '@maris-nails/shared';
import { CourseGateway } from '../gateways/course.gateway';
import { FileStorageGateway } from '../../storage/gateways/file-storage.gateway';

@Injectable()
export class UpdateCourseThumbnailUseCase {
  constructor(
    private readonly courseGateway: CourseGateway,
    private readonly fileStorageGateway: FileStorageGateway,
  ) {}

  async execute(id: string, file: Express.Multer.File): Promise<Course> {
    const course = await this.courseGateway.findOne(id);
    if (!course) throw new NotFoundException(`Curso ${id} no encontrado`);

    // Si ya había miniatura local, la borramos del disco antes de guardar la nueva.
    // isLocalFile() nos protege de intentar borrar URLs externas (YouTube, etc.).
    if (course.thumbnailUrl && this.fileStorageGateway.isLocalFile(course.thumbnailUrl)) {
      await this.fileStorageGateway.deleteFile(
        course.thumbnailUrl.replace('/static/', ''),
      );
    }

    const thumbnailUrl = await this.fileStorageGateway.saveFile(file, 'thumbnails');

    return this.courseGateway.update(id, { thumbnailUrl } as unknown as Partial<Course>);
  }
}

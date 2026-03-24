import { Injectable, NotFoundException } from '@nestjs/common';
import { Course } from '@maris-nails/shared';
import { CourseGateway } from '../gateways/course.gateway';
import { FileStorageGateway } from '../../storage/gateways/file-storage.gateway';

@Injectable()
export class DeleteCourseThumbnailUseCase {
  constructor(
    private readonly courseGateway: CourseGateway,
    private readonly fileStorageGateway: FileStorageGateway,
  ) {}

  async execute(id: string): Promise<Course> {
    const course = await this.courseGateway.findOne(id);
    if (!course) throw new NotFoundException(`Curso ${id} no encontrado`);

    if (course.thumbnailUrl && this.fileStorageGateway.isLocalFile(course.thumbnailUrl)) {
      await this.fileStorageGateway.deleteFile(
        course.thumbnailUrl.replace('/static/', ''),
      );
    }

    return this.courseGateway.update(id, { thumbnailUrl: undefined } as unknown as Partial<Course>);
  }
}

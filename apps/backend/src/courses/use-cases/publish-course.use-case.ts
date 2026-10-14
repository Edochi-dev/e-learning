import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CourseGateway } from '../gateways/course.gateway';

/** Makes a draft visible in the catalog and purchasable. */
@Injectable()
export class PublishCourseUseCase {
  constructor(private readonly courseGateway: CourseGateway) {}

  async execute(id: string): Promise<void> {
    const course = await this.courseGateway.findOne(id);
    if (!course) throw new NotFoundException('Curso no encontrado');
    if (course.isPublished()) return;
    if (!course.lessons?.length) {
      throw new BadRequestException(
        'Agrega al menos una lección antes de publicar el curso.',
      );
    }
    await this.courseGateway.setPublishedAt(id, new Date());
  }
}

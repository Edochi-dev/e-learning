import { Injectable, NotFoundException } from '@nestjs/common';
import { CourseGateway } from '../gateways/course.gateway';

/**
 * Takes the course out of the catalog and out of sale. Students already
 * enrolled keep their access: their lessons are reached by direct link.
 */
@Injectable()
export class UnpublishCourseUseCase {
  constructor(private readonly courseGateway: CourseGateway) {}

  async execute(id: string): Promise<void> {
    const course = await this.courseGateway.findOne(id);
    if (!course) throw new NotFoundException('Curso no encontrado');
    await this.courseGateway.setPublishedAt(id, null);
  }
}

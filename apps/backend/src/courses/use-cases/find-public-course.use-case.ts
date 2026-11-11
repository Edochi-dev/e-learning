import { Injectable, NotFoundException } from '@nestjs/common';
import { PublicCourse } from '@maris-nails/shared';
import { CourseGateway } from '../gateways/course.gateway';
import { toPublicCourse } from '../presenters/public-course.presenter';

/** The course as anyone may see it: no video URLs, no exam questions. */
@Injectable()
export class FindPublicCourseUseCase {
  constructor(private readonly courseGateway: CourseGateway) {}

  async execute(id: string): Promise<PublicCourse> {
    const course = await this.courseGateway.findOne(id);
    if (!course) {
      throw new NotFoundException(`Course with id ${id} not found`);
    }
    return toPublicCourse(course);
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { Course } from '../entities/course.entity';
import { CourseGateway } from '../gateways/course.gateway';

/** The full course, answers and video URLs included, for the course editor. */
@Injectable()
export class FindCourseForAdminUseCase {
  constructor(private readonly courseGateway: CourseGateway) {}

  async execute(id: string): Promise<Course> {
    const course = await this.courseGateway.findOne(id);
    if (!course) {
      throw new NotFoundException(`Course with id ${id} not found`);
    }
    return course;
  }
}

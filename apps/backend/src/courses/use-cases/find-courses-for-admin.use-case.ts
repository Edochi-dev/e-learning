import { Injectable } from '@nestjs/common';
import { Course } from '../entities/course.entity';
import { CourseGateway, CourseFilters } from '../gateways/course.gateway';
import { PaginatedResult } from '../../common/types/paginated-result.type';

/** Every course with its full data, for the admin course list. */
@Injectable()
export class FindCoursesForAdminUseCase {
  constructor(private readonly courseGateway: CourseGateway) {}

  execute(
    page: number,
    limit: number,
    filters?: CourseFilters,
  ): Promise<PaginatedResult<Course>> {
    return this.courseGateway.findAll(page, limit, filters);
  }
}

import { Injectable } from '@nestjs/common';
import { PublicCourse } from '@maris-nails/shared';
import { CourseGateway, CourseFilters } from '../gateways/course.gateway';
import { PaginatedResult } from '../../common/types/paginated-result.type';
import { toPublicCourse } from '../presenters/public-course.presenter';

/** The catalog page: published courses only, as public views (see toPublicCourse). */
@Injectable()
export class FindPublicCoursesUseCase {
  constructor(private readonly courseGateway: CourseGateway) {}

  async execute(
    page: number,
    limit: number,
    filters?: CourseFilters,
  ): Promise<PaginatedResult<PublicCourse>> {
    const result = await this.courseGateway.findAll(page, limit, {
      ...filters,
      publishedOnly: true,
    });
    return { ...result, data: result.data.map(toPublicCourse) };
  }
}

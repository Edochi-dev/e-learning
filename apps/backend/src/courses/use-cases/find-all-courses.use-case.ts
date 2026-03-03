import { Injectable } from '@nestjs/common';
import { Course } from '@maris-nails/shared';
import { CourseGateway } from '../gateways/course.gateway';
import { PaginatedResult } from '../../common/types/paginated-result.type';

@Injectable()
export class FindAllCoursesUseCase {
    constructor(private readonly courseGateway: CourseGateway) { }

    async execute(page: number, limit: number): Promise<PaginatedResult<Course>> {
        return this.courseGateway.findAll(page, limit);
    }
}

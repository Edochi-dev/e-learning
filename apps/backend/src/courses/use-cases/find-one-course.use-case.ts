import { Injectable, NotFoundException } from '@nestjs/common';
import { Course } from '@maris-nails/shared';
import { CourseGateway } from '../gateways/course.gateway';

@Injectable()
export class FindOneCourseUseCase {
    constructor(private readonly courseGateway: CourseGateway) { }

    execute(id: string): Course {
        const course = this.courseGateway.findOne(id);
        if (!course) {
            throw new NotFoundException(`Course with id ${id} not found`);
        }
        return course;
    }
}

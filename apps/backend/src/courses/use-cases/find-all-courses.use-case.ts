import { Injectable } from '@nestjs/common';
import { Course } from '@maris-nails/shared';
import { CourseGateway } from '../gateways/course.gateway';

@Injectable()
export class FindAllCoursesUseCase {
    constructor(private readonly courseGateway: CourseGateway) { }

    execute(): Course[] {
        return this.courseGateway.findAll();
    }
}

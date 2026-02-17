import { Injectable } from '@nestjs/common';
import { Course } from '@maris-nails/shared';
import { CourseGateway } from '../gateways/course.gateway';
import { CreateCourseDto } from '../dto/create-course.dto';

@Injectable()
export class CreateCourseUseCase {
    constructor(private readonly courseGateway: CourseGateway) { }

    async execute(dto: CreateCourseDto): Promise<Course> {
        return this.courseGateway.create(dto as unknown as Course);
    }
}

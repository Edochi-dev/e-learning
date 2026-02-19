import { Injectable, NotFoundException } from '@nestjs/common';
import { Course } from '@maris-nails/shared';
import { CourseGateway } from '../gateways/course.gateway';
import { UpdateCourseDto } from '../dto/update-course.dto';

@Injectable()
export class UpdateCourseUseCase {
    constructor(private readonly courseGateway: CourseGateway) { }

    async execute(id: string, dto: UpdateCourseDto): Promise<Course> {
        const course = await this.courseGateway.findOne(id);
        if (!course) {
            throw new NotFoundException(`Course with id ${id} not found`);
        }

        return this.courseGateway.update(id, dto as unknown as Partial<Course>);
    }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { Lesson } from '@maris-nails/shared';
import { CourseGateway } from '../gateways/course.gateway';
import { CreateLessonDto } from '../dto/create-lesson.dto';

@Injectable()
export class AddLessonUseCase {
    constructor(private readonly courseGateway: CourseGateway) { }

    async execute(courseId: string, dto: CreateLessonDto): Promise<Lesson> {
        const course = await this.courseGateway.findOne(courseId);
        if (!course) {
            throw new NotFoundException(`Course with id ${courseId} not found`);
        }

        return this.courseGateway.addLesson(courseId, dto);
    }
}

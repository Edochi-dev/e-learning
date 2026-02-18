import { Injectable } from '@nestjs/common';
import { CourseGateway } from '../gateways/course.gateway';

@Injectable()
export class RemoveLessonUseCase {
    constructor(private readonly courseGateway: CourseGateway) { }

    async execute(lessonId: string): Promise<void> {
        return this.courseGateway.removeLesson(lessonId);
    }
}

import { Course, Lesson } from '@maris-nails/shared';

export abstract class CourseGateway {
    abstract create(course: Course): Promise<Course>;
    abstract findAll(): Promise<Course[]>;
    abstract findOne(id: string): Promise<Course | null>;
    abstract addLesson(courseId: string, lesson: Partial<Lesson>): Promise<Lesson>;
    abstract removeLesson(lessonId: string): Promise<void>;
}

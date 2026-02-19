import { Course, Lesson } from '@maris-nails/shared';

export abstract class CourseGateway {
    abstract create(course: Course): Promise<Course>;
    abstract findAll(): Promise<Course[]>;
    abstract findOne(id: string): Promise<Course | null>;
    abstract update(id: string, data: Partial<Course>): Promise<Course>;
    abstract addLesson(courseId: string, lesson: Partial<Lesson>): Promise<Lesson>;
    abstract removeLesson(lessonId: string): Promise<void>;
}

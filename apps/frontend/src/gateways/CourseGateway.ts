import type { Course, CreateCoursePayload, UpdateCoursePayload, Lesson, CreateLessonPayload } from '@maris-nails/shared';

export interface CourseGateway {
    findAll(): Promise<Course[]>;
    findOne(id: string): Promise<Course>;
    create(course: CreateCoursePayload, token: string): Promise<Course>;
    update(id: string, data: UpdateCoursePayload, token: string): Promise<Course>;
    addLesson(courseId: string, lesson: CreateLessonPayload, token: string): Promise<Lesson>;
    removeLesson(courseId: string, lessonId: string, token: string): Promise<void>;
}

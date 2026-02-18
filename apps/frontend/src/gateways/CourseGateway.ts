import type { Course, CreateCoursePayload } from '@maris-nails/shared';

export interface CourseGateway {
    findAll(): Promise<Course[]>;
    findOne(id: string): Promise<Course>;
    create(course: CreateCoursePayload, token: string): Promise<Course>;
}

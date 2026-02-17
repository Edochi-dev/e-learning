import { Course } from '@maris-nails/shared';

export abstract class CourseGateway {
    abstract create(course: Course): Promise<Course>;
    abstract findAll(): Promise<Course[]>;
    abstract findOne(id: string): Promise<Course | null>;
}

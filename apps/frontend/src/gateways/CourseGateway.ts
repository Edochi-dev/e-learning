import type { Course } from '@maris-nails/shared';

export interface CourseGateway {
    findAll(): Promise<Course[]>;
    findOne(id: string): Promise<Course>;
}

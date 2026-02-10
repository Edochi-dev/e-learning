import { Course } from '@maris-nails/shared';

export abstract class CourseGateway {
    abstract findAll(): Course[];
    abstract findOne(id: string): Course | null;
}

import type { Course } from '@maris-nails/shared';
import type { CourseGateway } from './CourseGateway';

export class HttpCourseGateway implements CourseGateway {
    private readonly baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    async findAll(): Promise<Course[]> {
        const response = await fetch(`${this.baseUrl}/courses`);
        if (!response.ok) {
            throw new Error(`Failed to fetch courses: ${response.statusText}`);
        }
        return response.json();
    }

    async findOne(id: string): Promise<Course> {
        const response = await fetch(`${this.baseUrl}/courses/${id}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch course: ${response.statusText}`);
        }
        return response.json();
    }

    async create(course: any, token: string): Promise<Course> {
        const response = await fetch(`${this.baseUrl}/courses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(course),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || `Failed to create course: ${response.statusText}`);
        }
        return response.json();
    }
}

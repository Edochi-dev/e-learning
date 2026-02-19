import type { Course, Lesson, CreateLessonPayload } from '@maris-nails/shared';
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

    async update(id: string, data: any, token: string): Promise<Course> {
        const response = await fetch(`${this.baseUrl}/courses/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || `Failed to update course: ${response.statusText}`);
        }
        return response.json();
    }

    async addLesson(courseId: string, lesson: CreateLessonPayload, token: string): Promise<Lesson> {
        const response = await fetch(`${this.baseUrl}/courses/${courseId}/lessons`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(lesson),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || `Failed to add lesson: ${response.statusText}`);
        }
        return response.json();
    }

    async removeLesson(courseId: string, lessonId: string, token: string): Promise<void> {
        const response = await fetch(`${this.baseUrl}/courses/${courseId}/lessons/${lessonId}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || `Failed to remove lesson: ${response.statusText}`);
        }
    }
}

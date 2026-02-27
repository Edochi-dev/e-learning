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

    async create(course: any, token: string, thumbnail?: File): Promise<Course> {
        // FormData permite enviar texto + archivo en el mismo request (multipart/form-data).
        // IMPORTANTE: no agregar Content-Type manualmente. El browser lo pone solo
        // con el "boundary" correcto que Multer necesita para parsear el cuerpo.
        const body = new FormData();
        body.append('title', course.title);
        body.append('price', String(course.price));
        body.append('description', course.description);
        if (thumbnail) {
            // 'thumbnail' debe coincidir con el nombre del campo en FileInterceptor('thumbnail')
            body.append('thumbnail', thumbnail);
        }

        const response = await fetch(`${this.baseUrl}/courses`, {
            method: 'POST',
            headers: {
                // Solo el token de auth — sin Content-Type, el browser lo gestiona
                Authorization: `Bearer ${token}`,
            },
            body,
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

    async delete(id: string, token: string): Promise<void> {
        const response = await fetch(`${this.baseUrl}/courses/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });

        // 204 No Content es éxito — no hay body que parsear
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || `Failed to delete course: ${response.statusText}`);
        }
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

    /**
     * Actualiza una lección existente via PATCH.
     * Solo envía los campos que cambien (actualización parcial).
     * El backend se encarga de limpiar archivos huérfanos si el videoUrl cambió.
     */
    async updateLesson(courseId: string, lessonId: string, data: any, token: string): Promise<Lesson> {
        const response = await fetch(`${this.baseUrl}/courses/${courseId}/lessons/${lessonId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || `Failed to update lesson: ${response.statusText}`);
        }
        return response.json();
    }

    async reorderLessons(courseId: string, lessonIds: string[], token: string): Promise<void> {
        const response = await fetch(`${this.baseUrl}/courses/${courseId}/lessons/reorder`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ lessonIds }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || `Failed to reorder lessons: ${response.statusText}`);
        }
    }
}

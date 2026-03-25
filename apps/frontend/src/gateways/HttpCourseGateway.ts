import type { Course, Lesson, CreateLessonPayload, QuizQuestion } from '@maris-nails/shared';
import type { CourseGateway } from './CourseGateway';

export class HttpCourseGateway implements CourseGateway {
    private readonly baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private async parseErrorMessage(response: Response, fallback: string): Promise<string> {
        const text = await response.text();
        if (!text) return fallback;
        try {
            const body = JSON.parse(text);
            return body.message || fallback;
        } catch {
            return fallback;
        }
    }

    // TODO: cuando se construya la UI de paginación, actualizar el contrato completo:
    // CourseGateway.findAll(page, limit) → PaginatedResult<Course>
    // y pasar total/page/limit al hook y las páginas.
    async findAll(): Promise<Course[]> {
        const response = await fetch(`${this.baseUrl}/courses`);
        if (!response.ok) {
            throw new Error(`Failed to fetch courses: ${response.statusText}`);
        }
        const paginated = await response.json();
        return paginated.data;
    }

    async findOne(id: string): Promise<Course> {
        const response = await fetch(`${this.baseUrl}/courses/${id}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch course: ${response.statusText}`);
        }
        return response.json();
    }

    async create(course: any, thumbnail?: File): Promise<Course> {
        const body = new FormData();
        body.append('title', course.title);
        body.append('price', String(course.price));
        body.append('description', course.description);
        if (thumbnail) {
            body.append('thumbnail', thumbnail);
        }

        const response = await fetch(`${this.baseUrl}/courses`, {
            method: 'POST',
            credentials: 'include',
            body,
        });

        if (!response.ok) {
            throw new Error(await this.parseErrorMessage(response, `Failed to create course: ${response.statusText}`));
        }
        return response.json();
    }

    async update(id: string, data: any): Promise<Course> {
        const response = await fetch(`${this.baseUrl}/courses/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error(await this.parseErrorMessage(response, `Failed to update course: ${response.statusText}`));
        }
        return response.json();
    }

    async updateThumbnail(id: string, file: File): Promise<Course> {
        const body = new FormData();
        body.append('thumbnail', file);

        const response = await fetch(`${this.baseUrl}/courses/${id}/thumbnail`, {
            method: 'PATCH',
            credentials: 'include',
            body,
        });

        if (!response.ok) {
            throw new Error(await this.parseErrorMessage(response, 'Error al actualizar la miniatura'));
        }
        return response.json();
    }

    async deleteThumbnail(id: string): Promise<void> {
        const response = await fetch(`${this.baseUrl}/courses/${id}/thumbnail`, {
            method: 'DELETE',
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error(await this.parseErrorMessage(response, 'Error al eliminar la miniatura'));
        }
    }

    async delete(id: string): Promise<void> {
        const response = await fetch(`${this.baseUrl}/courses/${id}`, {
            method: 'DELETE',
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error(await this.parseErrorMessage(response, `Failed to delete course: ${response.statusText}`));
        }
    }

    async addLesson(courseId: string, lesson: CreateLessonPayload): Promise<Lesson> {
        const response = await fetch(`${this.baseUrl}/courses/${courseId}/lessons`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(lesson),
        });

        if (!response.ok) {
            throw new Error(await this.parseErrorMessage(response, `Failed to add lesson: ${response.statusText}`));
        }
        return response.json();
    }

    async removeLesson(courseId: string, lessonId: string): Promise<void> {
        const response = await fetch(`${this.baseUrl}/courses/${courseId}/lessons/${lessonId}`, {
            method: 'DELETE',
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error(await this.parseErrorMessage(response, `Failed to remove lesson: ${response.statusText}`));
        }
    }

    /**
     * Actualiza una lección existente via PATCH.
     * Solo envía los campos que cambien (actualización parcial).
     * El backend se encarga de limpiar archivos huérfanos si el videoUrl cambió.
     */
    async updateLesson(courseId: string, lessonId: string, data: any): Promise<Lesson> {
        const response = await fetch(`${this.baseUrl}/courses/${courseId}/lessons/${lessonId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error(await this.parseErrorMessage(response, `Failed to update lesson: ${response.statusText}`));
        }
        return response.json();
    }

    async reorderLessons(courseId: string, lessonIds: string[]): Promise<void> {
        const response = await fetch(`${this.baseUrl}/courses/${courseId}/lessons/reorder`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ lessonIds }),
        });

        if (!response.ok) {
            throw new Error(await this.parseErrorMessage(response, `Failed to reorder lessons: ${response.statusText}`));
        }
    }

    async getQuizQuestions(courseId: string, lessonId: string): Promise<QuizQuestion[]> {
        const response = await fetch(
            `${this.baseUrl}/courses/${courseId}/lessons/${lessonId}/quiz`,
            { credentials: 'include' },
        );

        if (!response.ok) {
            throw new Error(await this.parseErrorMessage(response, 'Error al cargar las preguntas del quiz'));
        }
        return response.json();
    }
}

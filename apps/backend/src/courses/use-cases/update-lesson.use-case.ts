import { Injectable, NotFoundException } from '@nestjs/common';
import { Lesson } from '@maris-nails/shared';
import { CourseGateway } from '../gateways/course.gateway';
import { FileStorageGateway } from '../../storage/gateways/file-storage.gateway';
import { UpdateLessonDto } from '../dto/update-lesson.dto';

/**
 * UpdateLessonUseCase — Caso de uso para actualizar una lección
 *
 * Este es el CORAZÓN de la lógica de negocio para editar lecciones.
 * Aquí vive la regla de negocio más importante: la limpieza de archivos huérfanos.
 *
 * El flujo es:
 * 1. Buscar la lección actual (para saber qué videoUrl tiene AHORA)
 * 2. Si el videoUrl cambió:
 *    a. ¿El viejo videoUrl es un archivo local? (no YouTube)
 *    b. ¿Alguna OTRA lección lo usa?
 *    c. Si nadie más lo usa → BORRAR archivo del filesystem
 * 3. Actualizar la lección con los nuevos datos
 *
 * Nota cómo este use case depende de DOS gateways abstractos:
 * - CourseGateway → para buscar/actualizar lecciones en la DB
 * - FileStorageGateway → para borrar archivos del filesystem
 *
 * Ninguno de los dos es una clase concreta. Son abstracciones.
 * NestJS inyecta las implementaciones reales en runtime.
 */
@Injectable()
export class UpdateLessonUseCase {
    constructor(
        private readonly courseGateway: CourseGateway,
        private readonly fileStorageGateway: FileStorageGateway,
    ) { }

    async execute(lessonId: string, dto: UpdateLessonDto): Promise<Lesson> {
        // 1. Obtener la lección actual
        const currentLesson = await this.courseGateway.findLesson(lessonId);
        if (!currentLesson) {
            throw new NotFoundException(`Lesson with id ${lessonId} not found`);
        }

        // 2. Si el videoUrl cambió, evaluar limpieza de huérfano
        const oldVideoUrl = currentLesson.videoUrl;
        const newVideoUrl = dto.videoUrl;

        if (newVideoUrl && newVideoUrl !== oldVideoUrl) {
            await this.cleanupOrphanedFile(oldVideoUrl, lessonId);
        }

        // 3. Actualizar la lección
        return this.courseGateway.updateLesson(lessonId, dto as unknown as Partial<Lesson>);
    }

    /**
     * Limpia un archivo que ya no será usado por esta lección.
     *
     * Condiciones para borrar:
     * 1. Debe ser un archivo local (no YouTube/externo)
     * 2. Ninguna OTRA lección debe estar usándolo
     */
    private async cleanupOrphanedFile(videoUrl: string, excludeLessonId: string): Promise<void> {
        // ¿Es un archivo local? (ej: /static/videos/clase1.mp4)
        if (!this.fileStorageGateway.isLocalFile(videoUrl)) {
            return; // Es YouTube u otra URL externa, no hay nada que borrar
        }

        // ¿Alguna otra lección lo usa?
        const isReferenced = await this.courseGateway.isVideoUrlReferenced(videoUrl, excludeLessonId);
        if (isReferenced) {
            return; // Otra lección lo necesita, no borrar
        }

        // Nadie más lo usa → extraer la ruta relativa y borrar
        // "/static/videos/clase1.mp4" → "videos/clase1.mp4"
        const relativePath = videoUrl.replace('/static/', '');
        await this.fileStorageGateway.deleteFile(relativePath);
    }
}

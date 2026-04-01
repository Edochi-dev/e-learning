import { Injectable, NotFoundException } from '@nestjs/common';
import { Lesson } from '../entities/lessons.entity';
import { LessonGateway, LessonData } from '../gateways/lesson.gateway';
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
    private readonly lessonGateway: LessonGateway,
    private readonly fileStorageGateway: FileStorageGateway,
  ) {}

  async execute(lessonId: string, dto: UpdateLessonDto): Promise<Lesson> {
    // 1. Obtener la lección actual
    const currentLesson = await this.lessonGateway.findLesson(lessonId);
    if (!currentLesson) {
      throw new NotFoundException(`Lesson with id ${lessonId} not found`);
    }

    // 2. Si el videoUrl cambió, evaluar limpieza de huérfano
    const oldVideoUrl = currentLesson.videoData?.videoUrl;
    const newVideoUrl = dto.videoUrl;

    if (newVideoUrl && oldVideoUrl && newVideoUrl !== oldVideoUrl) {
      await this.cleanupOrphanedFile(oldVideoUrl, lessonId);
    }

    // 3. Construir LessonData con las preguntas ordenadas.
    //    El frontend las envía en el orden correcto, pero no manda el campo order.
    //    Nosotros lo calculamos aquí para que la BD las devuelva siempre ordenadas.
    const data: LessonData = {
      ...dto,
      questions: dto.questions?.map((q, index) => ({
        ...q,
        order: index,
      })),
    };

    // 4. Actualizar la lección
    return this.lessonGateway.updateLesson(lessonId, data);
  }

  /**
   * Limpia un archivo que ya no será usado por esta lección.
   *
   * Condiciones para borrar:
   * 1. Ninguna OTRA lección debe estar usándolo
   * 2. deleteByUrl se encarga de verificar si es local y de extraer la ruta
   */
  private async cleanupOrphanedFile(
    videoUrl: string,
    excludeLessonId: string,
  ): Promise<void> {
    // ¿Alguna otra lección lo usa?
    const isReferenced = await this.lessonGateway.isVideoUrlReferenced(
      videoUrl,
      excludeLessonId,
    );
    if (isReferenced) {
      return; // Otra lección lo necesita, no borrar
    }

    // Nadie más lo usa → deleteByUrl se encarga de verificar si es local
    // y de extraer la ruta relativa. URLs externas se ignoran silenciosamente.
    await this.fileStorageGateway.deleteByUrl(videoUrl);
  }
}

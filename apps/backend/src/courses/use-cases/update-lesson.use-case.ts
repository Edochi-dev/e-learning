import { Injectable, NotFoundException } from '@nestjs/common';
import { Lesson } from '../entities/lessons.entity';
import { LessonGateway, LessonData } from '../gateways/lesson.gateway';
import { OrphanFileCleaner } from '../../storage/services/orphan-file-cleaner.service';
import { UpdateLessonDto } from '../dto/update-lesson.dto';

/**
 * UpdateLessonUseCase — Caso de uso para actualizar una lección.
 *
 * Aquí vive una regla de negocio importante: si el videoUrl cambia, el archivo
 * viejo se vuelve un candidato a huérfano. Hay que borrarlo SOLO si ninguna
 * otra lección lo usa.
 *
 * El flujo es:
 *   1. Buscar la lección actual (para saber qué videoUrl tiene AHORA).
 *   2. Si el videoUrl cambió → delegar al OrphanFileCleaner con un checker
 *      que excluye a esta lección (porque ella todavía aparece en la DB
 *      con el videoUrl viejo hasta que terminemos el update).
 *   3. Actualizar la lección con los nuevos datos.
 *
 * Nota cómo este use case ya NO conoce la mecánica de "verificar referencia
 * + delete file". Solo sabe QUIÉN puede informar si el video sigue en uso
 * (LessonGateway) y delega a OrphanFileCleaner para ejecutar la decisión.
 */
@Injectable()
export class UpdateLessonUseCase {
  constructor(
    private readonly lessonGateway: LessonGateway,
    private readonly orphanFileCleaner: OrphanFileCleaner,
  ) {}

  async execute(lessonId: string, dto: UpdateLessonDto): Promise<Lesson> {
    // 1. Obtener la lección actual
    const currentLesson = await this.lessonGateway.findLesson(lessonId);
    if (!currentLesson) {
      throw new NotFoundException(`Lesson with id ${lessonId} not found`);
    }

    // 2. Si el videoUrl cambió, evaluar limpieza de huérfano.
    //    Excluimos esta lección del checker porque su DB row todavía
    //    apunta al video viejo en este momento.
    const oldVideoUrl = currentLesson.videoData?.videoUrl;
    const newVideoUrl = dto.videoUrl;

    if (newVideoUrl && oldVideoUrl && newVideoUrl !== oldVideoUrl) {
      await this.orphanFileCleaner.deleteIfOrphan(oldVideoUrl, () =>
        this.lessonGateway.isVideoUrlReferenced(oldVideoUrl, lessonId),
      );
    }

    // 3. Construir LessonData con el tipo de la lección actual.
    //    LessonData es una unión discriminada: necesita `type` para que TypeScript
    //    sepa qué forma tiene. Usamos el tipo de la lección existente en la DB
    //    (no se permite cambiar el tipo de una lección vía update).
    //    Para exámenes, ordenamos las preguntas porque el frontend no manda el campo order.
    const data: LessonData = {
      ...dto,
      type: currentLesson.type,
      questions:
        currentLesson.type === 'exam'
          ? dto.questions?.map((q, index) => ({
              ...q,
              order: index,
            }))
          : undefined,
    } as LessonData;

    // 4. Actualizar la lección
    return this.lessonGateway.updateLesson(lessonId, data);
  }
}

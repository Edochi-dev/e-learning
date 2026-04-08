import { Injectable, NotFoundException } from '@nestjs/common';
import { CourseGateway } from '../gateways/course.gateway';
import { LessonGateway } from '../gateways/lesson.gateway';
import { OrphanFileCleaner } from '../../storage/services/orphan-file-cleaner.service';

/**
 * DeleteCourseUseCase — Elimina un curso y limpia todos sus archivos huérfanos.
 *
 * Orden de operaciones — DB primero, archivos después:
 *
 *   1. Leer el curso con sus lecciones → anotar en memoria todas las rutas de archivos.
 *   2. Borrar el curso de la DB (las lecciones caen en cascada).
 *      Si esto falla → todos los archivos siguen intactos, nada roto ✅.
 *   3. Por cada videoUrl único de las lecciones: si ya no lo usa nadie → borrar.
 *   4. Si la thumbnailUrl ya no la usa ningún curso → borrar.
 *
 * Los pasos 3 y 4 son "best-effort": si falla el borrado de un archivo concreto,
 * no cancelamos los demás (Promise.allSettled). El peor caso es un storage leak,
 * no una rotura de datos visible para el usuario.
 *
 * ¿Por qué "DB primero"?
 * Si borráramos archivos primero y la DB fallara, el curso seguiría existiendo
 * pero con videos rotos — irrecuperable sin re-subir los archivos manualmente.
 * Un archivo extra en disco es molestia de dev; un curso roto es problema de usuario.
 *
 * Nota arquitectónica: la lógica "¿está referenciado? → borrar" la delegamos a
 * OrphanFileCleaner. Este use case solo se preocupa de QUÉ archivos pueden ser
 * huérfanos y QUIÉN sabe si lo son — no de CÓMO se ejecuta esa decisión.
 */
@Injectable()
export class DeleteCourseUseCase {
  constructor(
    private readonly courseGateway: CourseGateway,
    private readonly lessonGateway: LessonGateway,
    private readonly orphanFileCleaner: OrphanFileCleaner,
  ) {}

  async execute(id: string): Promise<void> {
    // Paso 1: leer el curso ANTES de borrarlo para anotar las rutas en memoria
    const course = await this.courseGateway.findOne(id);

    if (!course) {
      throw new NotFoundException(`Curso con id ${id} no encontrado`);
    }

    // Recopilar videoUrls únicos de todas las lecciones.
    // Set<string> elimina duplicados: si dos lecciones compartieran video,
    // solo procesamos el archivo una vez.
    const videoUrls = new Set<string>();
    for (const lesson of course.lessons ?? []) {
      const videoUrl = lesson.videoData?.videoUrl;
      if (videoUrl) {
        videoUrls.add(videoUrl);
      }
    }

    const thumbnailUrl = course.thumbnailUrl ?? null;

    // Paso 2: borrar el curso — si falla aquí, los archivos siguen intactos ✅
    // Las lecciones se eliminan en cascada (cascade: true en la entidad Course)
    await this.courseGateway.delete(id);

    // Pasos 3 y 4: limpieza de archivos (best-effort).
    // El curso y sus lecciones ya no existen en la DB, así que las queries
    // de "¿sigue en uso?" son simples conteos sin exclusiones.

    // Paso 3: limpiar videos de las lecciones
    await Promise.allSettled(
      [...videoUrls].map((videoUrl) =>
        this.orphanFileCleaner.deleteIfOrphan(videoUrl, () =>
          this.lessonGateway.isVideoUrlInUse(videoUrl),
        ),
      ),
    );

    // Paso 4: limpiar la miniatura del curso
    if (thumbnailUrl) {
      await this.orphanFileCleaner.deleteIfOrphan(thumbnailUrl, () =>
        this.courseGateway.isThumbnailUrlInUse(thumbnailUrl),
      );
    }
  }
}

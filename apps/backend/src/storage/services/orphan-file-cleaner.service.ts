import { Injectable } from '@nestjs/common';
import { FileStorageGateway } from '../gateways/file-storage.gateway';

/**
 * ReferenceChecker — Estrategia inyectada por el caller.
 *
 * El cleaner no sabe NADA sobre cursos, lecciones o thumbnails.
 * Solo sabe ejecutar una función que devuelve un booleano:
 * "¿este archivo aún está referenciado por algún recurso del dominio?"
 *
 * El use case que lo invoca es quien construye esta función con el gateway
 * apropiado (LessonGateway, CourseGateway, etc.) y los argumentos correctos
 * (excludeId, etc.). Esto mantiene al cleaner totalmente desacoplado del
 * dominio — puede limpiar archivos huérfanos de CUALQUIER tipo de recurso
 * sin tener que conocer ninguno.
 */
export type ReferenceChecker = () => Promise<boolean>;

/**
 * OrphanFileCleaner — Servicio de aplicación que centraliza el patrón
 * "verificar si un archivo está huérfano y, si lo está, borrarlo".
 *
 * ¿Por qué existe?
 * Antes este patrón vivía duplicado en 4 use cases distintos
 * (delete-course, update-lesson, update-course-thumbnail, delete-course-thumbnail),
 * cada uno con su propia variante del mismo if/await/delete. La duplicación
 * traía dos riesgos:
 *   1. Drift: cualquier ajuste futuro al algoritmo había que replicarlo
 *      en N sitios, con el riesgo de olvidarse de uno.
 *   2. Bugs por omisión: dos de los cuatro use cases (los de thumbnail) ni
 *      siquiera chequeaban referencias antes de borrar — podían dejar
 *      otros cursos con un broken link.
 *
 * Tras este refactor, todos los use cases delegan al mismo método.
 * El algoritmo vive en un solo lugar y se prueba una sola vez.
 *
 * ¿Por qué es un servicio de aplicación y no un domain service?
 * Porque no captura ninguna regla de negocio del dominio (un curso no sabe
 * qué es un "archivo huérfano"). Es pura orquestación entre el contrato
 * de almacenamiento y un predicado que el caller define. Vive en la capa
 * de aplicación, junto al storage del que depende.
 *
 * ¿Por qué un callback en vez de una interfaz/clase Strategy?
 * Porque cada caller tiene su propio criterio (y sus propios IDs a excluir),
 * así que necesitaríamos una clase nueva por cada llamada. Un callback es
 * Strategy con UN solo método — la simplificación está justificada cuando
 * el contrato es así de pequeño.
 */
@Injectable()
export class OrphanFileCleaner {
  constructor(private readonly fileStorageGateway: FileStorageGateway) {}

  /**
   * Borra un archivo si y solo si nadie más lo referencia.
   *
   * Pasos:
   *   1. Si la URL es vacía/null → no hay nada que hacer.
   *   2. Pregunta al ReferenceChecker. Si devuelve true → otro recurso lo
   *      necesita, no tocar el archivo.
   *   3. Delega a FileStorageGateway.deleteByUrl, que internamente decide
   *      si la URL apunta a un archivo local del backend o a un recurso
   *      externo (YouTube, CDN). Las externas se ignoran silenciosamente.
   *
   * @param url           URL pública del archivo (puede ser local o externa)
   * @param isReferenced  Función que indica si el archivo aún es referenciado
   *                      por algún recurso del dominio (excluyendo, si toca,
   *                      al recurso que motiva la limpieza).
   */
  async deleteIfOrphan(
    url: string | null | undefined,
    isReferenced: ReferenceChecker,
  ): Promise<void> {
    if (!url) return;

    const referenced = await isReferenced();
    if (referenced) return;

    await this.fileStorageGateway.deleteByUrl(url);
  }
}

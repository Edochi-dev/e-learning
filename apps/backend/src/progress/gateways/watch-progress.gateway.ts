/**
 * WatchProgressGateway -- Contrato abstracto para el progreso de video.
 *
 * Responsabilidad UNICA: rastrear cuánto porcentaje de video ha visto un alumno.
 *
 * Está separado de LessonProgressGateway porque son conceptos distintos:
 *   - LessonProgress = binario (completada o no)
 *   - WatchProgress  = continuo (0% a 100% de video visto)
 *
 * Si mañana el progreso de video se guarda en Redis (para alta frecuencia
 * de escritura), solo cambias el binding en el module. Los use cases
 * que manejan quizzes o matrículas ni se enteran.
 */
export abstract class WatchProgressGateway {
  /**
   * Suma los segmentos vistos en una sesión a los ya guardados (unión: nunca
   * retrocede) y devuelve el porcentaje acumulado de la lección.
   */
  abstract recordWatchedSegments(
    userId: string,
    lessonId: string,
    segments: number[],
  ): Promise<number>;

  /**
   * Devuelve el porcentaje visto por lección dentro de un curso.
   * Retorna: { 'lessonId-A': 75, 'lessonId-B': 30 }
   */
  abstract getWatchProgressByCourse(
    userId: string,
    courseId: string,
  ): Promise<Record<string, number>>;
}

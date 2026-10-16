import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WatchProgressGateway } from '../gateways/watch-progress.gateway';
import { LessonProgress } from '../entities/lesson-progress.entity';
import { toSegmentBits } from '../domain/watched-segments';

/**
 * WatchProgressRepository -- Implementación concreta de WatchProgressGateway.
 *
 * Curiosidad: usa la misma tabla lesson_progress que LessonProgressRepository.
 * Eso está bien — la tabla es un detalle de implementación (infraestructura).
 * Los gateways son contratos de NEGOCIO, no un mapeo 1:1 con tablas.
 *
 * Dos gateways pueden leer/escribir la misma tabla si representan
 * responsabilidades de negocio distintas:
 *   - LessonProgressGateway → "¿completó la lección?" (binario)
 *   - WatchProgressGateway  → "¿cuánto video vio?" (porcentaje continuo)
 */
@Injectable()
export class WatchProgressRepository implements WatchProgressGateway {
  constructor(
    @InjectRepository(LessonProgress)
    private readonly lessonProgressRepository: Repository<LessonProgress>,
  ) {}

  /**
   * Upsert atómico: OR de bits con lo guardado y el porcentaje recalculado en
   * la misma sentencia, así dos pestañas a la vez no se pisan. Una lección ya
   * completada conserva su porcentaje (pudo completarse a mano antes del 100%).
   *
   * SQL directo: TypeORM no expresa el OR de bits ni el CASE en ON CONFLICT.
   */
  async recordWatchedSegments(
    userId: string,
    lessonId: string,
    segments: number[],
  ): Promise<number> {
    const rows: { watchedPercent: number }[] =
      await this.lessonProgressRepository.query(
        `INSERT INTO lesson_progress ("userId", "lessonId", "watchedSegments", "watchedPercent")
         VALUES ($1, $2, $3::bit(100), bit_count($3::bit(100)))
         ON CONFLICT ("userId", "lessonId")
         DO UPDATE SET
           "watchedSegments" = lesson_progress."watchedSegments" | EXCLUDED."watchedSegments",
           "watchedPercent" = CASE WHEN lesson_progress."completedAt" IS NULL
             THEN bit_count(lesson_progress."watchedSegments" | EXCLUDED."watchedSegments")
             ELSE lesson_progress."watchedPercent" END
         RETURNING "watchedPercent"`,
        [userId, lessonId, toSegmentBits(segments)],
      );
    return Number(rows[0].watchedPercent);
  }

  /**
   * Devuelve el porcentaje visto por lección en un curso.
   *
   * JOIN con lessons para filtrar por courseId (LessonProgress no tiene courseId directo).
   * reduce() convierte las filas en un Record: { 'lessonId': 75, 'lessonId': 30 }
   */
  async getWatchProgressByCourse(
    userId: string,
    courseId: string,
  ): Promise<Record<string, number>> {
    const rows = await this.lessonProgressRepository
      .createQueryBuilder('lp')
      .innerJoin('lessons', 'l', 'l.id = lp."lessonId"')
      .where('lp."userId" = :userId', { userId })
      .andWhere('l."courseId" = :courseId', { courseId })
      .select('lp."lessonId"', 'lessonId')
      .addSelect('lp."watchedPercent"', 'watchedPercent')
      .getRawMany<{ lessonId: string; watchedPercent: number }>();

    return rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.lessonId] = row.watchedPercent;
      return acc;
    }, {});
  }
}

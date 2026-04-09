import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WatchProgressGateway } from '../gateways/watch-progress.gateway';
import { LessonProgress } from '../entities/lesson-progress.entity';

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
   * INSERT ... ON CONFLICT con condición especial:
   *   - Crea el registro si no existe (primer avance del alumno).
   *   - Si ya existe: actualiza SOLO si el nuevo percent > el guardado
   *     Y la lección no está completada (no pisamos la compleción).
   *
   * Usa SQL directo porque TypeORM no soporta WHERE en ON CONFLICT nativamente.
   */
  async saveWatchProgress(
    userId: string,
    lessonId: string,
    percent: number,
  ): Promise<void> {
    await this.lessonProgressRepository.query(
      `INSERT INTO lesson_progress ("userId", "lessonId", "watchedPercent")
       VALUES ($1, $2, $3)
       ON CONFLICT ("userId", "lessonId")
       DO UPDATE SET "watchedPercent" = EXCLUDED."watchedPercent"
       WHERE EXCLUDED."watchedPercent" > lesson_progress."watchedPercent"
         AND lesson_progress."completedAt" IS NULL`,
      [userId, lessonId, percent],
    );
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

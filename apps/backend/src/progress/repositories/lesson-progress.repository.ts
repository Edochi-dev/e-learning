import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LessonProgressGateway } from '../gateways/lesson-progress.gateway';
import { LessonProgress } from '../entities/lesson-progress.entity';

/**
 * LessonProgressRepository -- Implementación concreta de LessonProgressGateway.
 *
 * Este es el UNICO lugar que sabe de TypeORM para progreso de lecciones.
 * Solo inyecta Repository<LessonProgress> — no sabe de Enrollment ni QuizAttempt.
 *
 * Antes, estos métodos vivían en EnrollmentsRepository junto con otros 10 métodos.
 * Un repositorio que inyecta 3 repos de TypeORM diferentes es una señal clara
 * de que está haciendo demasiado (god-class).
 */
@Injectable()
export class LessonProgressRepository implements LessonProgressGateway {
  constructor(
    @InjectRepository(LessonProgress)
    private readonly lessonProgressRepository: Repository<LessonProgress>,
  ) {}

  /**
   * Marca una lección como completada de forma idempotente.
   *
   * Usa upsert: si el registro no existe, lo crea. Si ya existe, lo actualiza.
   * skipUpdateIfNoValuesChanged evita escrituras innecesarias cuando ya estaba completado.
   */
  async markLessonComplete(
    userId: string,
    lessonId: string,
  ): Promise<LessonProgress> {
    await this.lessonProgressRepository.upsert(
      { userId, lessonId, completedAt: new Date(), watchedPercent: 100 },
      {
        conflictPaths: ['userId', 'lessonId'],
        skipUpdateIfNoValuesChanged: true,
      },
    );
    return this.lessonProgressRepository.findOne({
      where: { userId, lessonId },
    }) as Promise<LessonProgress>;
  }

  /**
   * Devuelve los IDs de lecciones completadas en un curso específico.
   *
   * El JOIN con lessons es necesario porque LessonProgress no tiene courseId directo.
   * Navegamos: LessonProgress → Lesson → courseId.
   */
  async getCompletedLessonIds(
    userId: string,
    courseId: string,
  ): Promise<string[]> {
    const results = await this.lessonProgressRepository
      .createQueryBuilder('lp')
      .innerJoin('lessons', 'l', 'l.id = lp."lessonId"')
      .where('lp."userId" = :userId', { userId })
      .andWhere('l."courseId" = :courseId', { courseId })
      .andWhere('lp."completedAt" IS NOT NULL')
      .select('lp."lessonId"', 'lessonId')
      .getRawMany<{ lessonId: string }>();

    return results.map((r) => r.lessonId);
  }

  /**
   * Trae TODO el progreso del usuario agrupado por courseId en UNA sola query.
   *
   * El reduce() convierte filas planas { courseId, lessonId } en un objeto agrupado:
   *   { 'uuid-A': ['uuid-1', 'uuid-2'], 'uuid-B': ['uuid-5'] }
   *
   * acc[row.courseId] ??= [] significa: "si no existe, inicializa como array vacío".
   */
  async getCompletedLessonIdsByCourse(
    userId: string,
  ): Promise<Record<string, string[]>> {
    const rows = await this.lessonProgressRepository
      .createQueryBuilder('lp')
      .innerJoin('lessons', 'l', 'l.id = lp."lessonId"')
      .where('lp."userId" = :userId', { userId })
      .andWhere('lp."completedAt" IS NOT NULL')
      .select('lp."lessonId"', 'lessonId')
      .addSelect('l."courseId"', 'courseId')
      .getRawMany<{ lessonId: string; courseId: string }>();

    return rows.reduce<Record<string, string[]>>((acc, row) => {
      acc[row.courseId] ??= [];
      acc[row.courseId].push(row.lessonId);
      return acc;
    }, {});
  }
}

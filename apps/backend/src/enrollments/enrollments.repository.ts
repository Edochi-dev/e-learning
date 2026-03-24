import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EnrollmentGateway } from './gateways/enrollment.gateway';
import { Enrollment } from './entities/enrollment.entity';
import { LessonProgress } from './entities/lesson-progress.entity';

/**
 * EnrollmentsRepository — Implementación concreta del EnrollmentGateway.
 *
 * Esta clase es el único lugar de toda la aplicación que sabe de TypeORM
 * y PostgreSQL en el contexto de matrículas.
 *
 * Si mañana cambias a MongoDB o una API externa de pagos, solo creas
 * una nueva clase que implemente EnrollmentGateway y cambias el binding
 * en el module. Los Use Cases no se enteran del cambio.
 */
@Injectable()
export class EnrollmentsRepository implements EnrollmentGateway {
  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(LessonProgress)
    private readonly lessonProgressRepository: Repository<LessonProgress>,
  ) {}

  async enroll(userId: string, courseId: string): Promise<Enrollment> {
    const enrollment = this.enrollmentRepository.create({ userId, courseId });
    return this.enrollmentRepository.save(enrollment);
  }

  async findById(id: string): Promise<Enrollment | null> {
    return this.enrollmentRepository.findOne({ where: { id } });
  }

  async findByUserAndCourse(
    userId: string,
    courseId: string,
  ): Promise<Enrollment | null> {
    return this.enrollmentRepository.findOne({ where: { userId, courseId } });
  }

  /**
   * Carga las matrículas con su curso y las lecciones de ese curso.
   *
   * relations: ['course', 'course.lessons'] le dice a TypeORM que haga
   * los JOINs necesarios para cargar esas relaciones anidadas en una sola query.
   *
   * Necesitamos 'course.lessons' para que el Use Case pueda calcular totalLessons.
   */
  async findByUserWithCourses(userId: string): Promise<Enrollment[]> {
    return this.enrollmentRepository.find({
      where: { userId },
      relations: ['course', 'course.lessons'],
      order: { enrolledAt: 'DESC' },
    });
  }

  /**
   * Trae TODO el progreso del usuario en UNA sola query y lo agrupa en JavaScript.
   *
   * El SQL trae filas planas como:
   *   { courseId: 'uuid-A', lessonId: 'uuid-1' }
   *   { courseId: 'uuid-A', lessonId: 'uuid-2' }
   *   { courseId: 'uuid-B', lessonId: 'uuid-5' }
   *
   * El reduce() las convierte en un objeto agrupado:
   *   { 'uuid-A': ['uuid-1', 'uuid-2'], 'uuid-B': ['uuid-5'] }
   *
   * ¿Qué hace reduce()?
   *   Recorre el array acumulando resultados en un objeto vacío {}.
   *   Por cada fila: si el courseId ya existe en el acumulador, añade el lessonId.
   *   Si no existe, crea un array nuevo con ese lessonId.
   *   acc[row.courseId] ??= []  →  "si no existe, inicializa como array vacío"
   */
  async getCompletedLessonIdsByCourse(
    userId: string,
  ): Promise<Record<string, string[]>> {
    const rows = await this.lessonProgressRepository
      .createQueryBuilder('lp')
      .innerJoin('lessons', 'l', 'l.id = lp."lessonId"')
      .where('lp."userId" = :userId', { userId })
      // Solo lecciones realmente completadas (completedAt puede ser null si solo se guardó watchedPercent)
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

  /**
   * Devuelve los IDs de lecciones completadas por un usuario en un curso específico.
   * Para la vista de detalle de un único curso — no usar en listas (usa getByCourse).
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
   * Marca una lección como completada de forma idempotente.
   *
   * Idempotente significa: llamarlo una o diez veces produce el mismo resultado.
   * Si la lección ya estaba completada, devolvemos el registro existente
   * sin crear un duplicado (la restricción UNIQUE en la DB también lo evitaría,
   * pero así damos una respuesta limpia en lugar de lanzar un error de DB).
   */
  async markLessonComplete(
    userId: string,
    lessonId: string,
  ): Promise<LessonProgress> {
    // Fijamos completedAt y watchedPercent=100.
    // Si el registro ya existía (el alumno guardó progreso antes), lo actualizamos.
    // Si ya estaba completado, el upsert es idempotente y no cambia nada.
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

  async saveWatchProgress(
    userId: string,
    lessonId: string,
    percent: number,
  ): Promise<void> {
    // INSERT ... ON CONFLICT DO UPDATE con condición:
    //   - Crea el registro si no existe (primer avance del alumno en esta lección).
    //   - Si ya existe: actualiza watchedPercent SOLO si el nuevo es mayor Y la lección
    //     no está completada (no retrocedemos progreso ni pisamos la compleción).
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

  async delete(id: string): Promise<void> {
    await this.enrollmentRepository.delete(id);
  }
}

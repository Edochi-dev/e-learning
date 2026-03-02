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

    async findByUserAndCourse(userId: string, courseId: string): Promise<Enrollment | null> {
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
     * Devuelve los IDs de lecciones completadas por un usuario en un curso específico.
     *
     * Usamos QueryBuilder porque necesitamos un JOIN entre dos tablas que
     * TypeORM no puede hacer automáticamente con el método find():
     *   lesson_progress (tiene userId y lessonId)  →  JOIN  →  lessons (tiene courseId)
     *
     * getRawMany() devuelve objetos planos (no entidades), por eso usamos
     * r.lessonId con el alias que definimos en .select('lp."lessonId"', 'lessonId').
     */
    async getCompletedLessonIds(userId: string, courseId: string): Promise<string[]> {
        const results = await this.lessonProgressRepository
            .createQueryBuilder('lp')
            .innerJoin('lessons', 'l', 'l.id = lp."lessonId"')
            .where('lp."userId" = :userId', { userId })
            .andWhere('l."courseId" = :courseId', { courseId })
            .select('lp."lessonId"', 'lessonId')
            .getRawMany();

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
    async markLessonComplete(userId: string, lessonId: string): Promise<LessonProgress> {
        const existing = await this.lessonProgressRepository.findOne({
            where: { userId, lessonId },
        });

        if (existing) return existing;

        const progress = this.lessonProgressRepository.create({ userId, lessonId });
        return this.lessonProgressRepository.save(progress);
    }

    async delete(id: string): Promise<void> {
        await this.enrollmentRepository.delete(id);
    }
}

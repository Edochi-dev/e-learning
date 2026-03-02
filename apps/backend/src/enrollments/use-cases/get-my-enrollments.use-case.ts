import { Injectable } from '@nestjs/common';
import { EnrollmentGateway } from '../gateways/enrollment.gateway';

/**
 * EnrollmentWithProgress — Forma final de los datos que devolvemos al frontend.
 *
 * Es una "vista" calculada en base a los datos de DB. No es una entidad guardada,
 * por eso vive aquí en el Use Case y no en la carpeta de entidades.
 */
export interface EnrollmentWithProgress {
    enrollmentId: string;
    enrolledAt: Date;
    course: {
        id: string;
        title: string;
        description: string;
        thumbnailUrl: string | null;
        totalLessons: number;
    };
    completedLessons: number;
    progressPercent: number;
}

/**
 * GetMyEnrollmentsUseCase — Devuelve todos los cursos del alumno con su progreso.
 *
 * El progreso se CALCULA aquí, en la capa de negocio, no en la DB ni en el frontend.
 *   progressPercent = (lecciones completadas / total lecciones) * 100
 *
 * Usamos Promise.all() para calcular el progreso de todos los cursos EN PARALELO.
 * Sin Promise.all(), esperaríamos cada curso uno por uno (más lento).
 */
@Injectable()
export class GetMyEnrollmentsUseCase {
    constructor(private readonly enrollmentGateway: EnrollmentGateway) {}

    async execute(userId: string): Promise<EnrollmentWithProgress[]> {
        const enrollments = await this.enrollmentGateway.findByUserWithCourses(userId);

        const results = await Promise.all(
            enrollments.map(async (enrollment) => {
                const completedIds = await this.enrollmentGateway.getCompletedLessonIds(
                    userId,
                    enrollment.courseId,
                );

                const totalLessons = enrollment.course.lessons?.length ?? 0;
                const completedLessons = completedIds.length;
                const progressPercent =
                    totalLessons > 0
                        ? Math.round((completedLessons / totalLessons) * 100)
                        : 0;

                return {
                    enrollmentId: enrollment.id,
                    enrolledAt: enrollment.enrolledAt,
                    course: {
                        id: enrollment.course.id,
                        title: enrollment.course.title,
                        description: enrollment.course.description,
                        thumbnailUrl: enrollment.course.thumbnailUrl ?? null,
                        totalLessons,
                    },
                    completedLessons,
                    progressPercent,
                };
            }),
        );

        return results;
    }
}

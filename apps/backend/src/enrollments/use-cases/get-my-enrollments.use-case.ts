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
 * Siempre hace exactamente 2 queries a la DB, sin importar cuántos cursos tenga el usuario:
 *   1. findByUserWithCourses()         → matrículas + cursos + lecciones
 *   2. getCompletedLessonIdsByCourse() → todo el progreso del usuario de una vez
 *
 * El .map() final es SÍNCRONO (no async, no await): solo reorganiza datos que
 * ya están en memoria. No va a la red ni a la base de datos.
 */
@Injectable()
export class GetMyEnrollmentsUseCase {
  constructor(private readonly enrollmentGateway: EnrollmentGateway) {}

  async execute(userId: string): Promise<EnrollmentWithProgress[]> {
    // Query 1: matrículas con sus cursos y lecciones
    const enrollments =
      await this.enrollmentGateway.findByUserWithCourses(userId);

    // Query 2: todo el progreso del usuario, agrupado por courseId
    // Ej: { 'uuid-A': ['uuid-l1', 'uuid-l2'], 'uuid-B': ['uuid-l5'] }
    const completedByCourse =
      await this.enrollmentGateway.getCompletedLessonIdsByCourse(userId);

    // Cálculo en memoria: rápido, sin más queries
    return enrollments.map((enrollment) => {
      const completedIds = completedByCourse[enrollment.courseId] ?? [];
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
    });
  }
}

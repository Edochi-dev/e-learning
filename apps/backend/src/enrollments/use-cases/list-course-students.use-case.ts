import { Injectable } from '@nestjs/common';
import { EnrollmentGateway } from '../gateways/enrollment.gateway';

/** Vista administrativa de una alumna matriculada y el estado de su acceso. */
export interface CourseStudent {
  enrollmentId: string;
  enrolledAt: Date;
  student: {
    id: string;
    fullName: string;
    email: string;
  };
  expiresAt: Date | null;
  isActive: boolean;
  daysRemaining: number | null;
}

/**
 * ListCourseStudentsUseCase — Alumnas de un curso, para el panel de la profesora.
 *
 * Devuelve el estado del acceso ya resuelto por el servidor, igual que la vista
 * de la alumna: quien decide si una matrícula sigue viva es siempre el backend.
 */
@Injectable()
export class ListCourseStudentsUseCase {
  constructor(private readonly enrollmentGateway: EnrollmentGateway) {}

  async execute(courseId: string): Promise<CourseStudent[]> {
    const enrollments =
      await this.enrollmentGateway.findByCourseWithUsers(courseId);

    // Un único instante para toda la lista: dos filas que vencen a la misma
    // hora no pueden reportar estados distintos.
    const now = new Date();

    return enrollments.map((enrollment) => ({
      enrollmentId: enrollment.id,
      enrolledAt: enrollment.enrolledAt,
      student: {
        id: enrollment.user.id,
        fullName: enrollment.user.fullName,
        email: enrollment.user.email,
      },
      expiresAt: enrollment.expiresAt,
      isActive: enrollment.isActive(now),
      daysRemaining: enrollment.daysRemaining(now),
    }));
  }
}

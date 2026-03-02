import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentGateway } from '../gateways/enrollment.gateway';
import { CourseGateway } from '../../courses/gateways/course.gateway';
import { Enrollment } from '../entities/enrollment.entity';

/**
 * EnrollInCourseUseCase — Lógica de negocio para matricularse en un curso.
 *
 * Recibe SOLO el userId y el courseId — nunca el objeto User completo.
 * Los Use Cases trabajan con IDs y datos primitivos, no con objetos HTTP.
 *
 * Pasos:
 *   1. Verificar que el curso existe (si no, 404)
 *   2. Verificar que el usuario NO está ya matriculado (si sí, 409 Conflict)
 *   3. Crear la matrícula
 *
 * Nota: inyectamos CourseGateway (no CoursesRepository) para respetar
 * la dirección de dependencias. El Use Case solo conoce abstracciones.
 */
@Injectable()
export class EnrollInCourseUseCase {
    constructor(
        private readonly enrollmentGateway: EnrollmentGateway,
        private readonly courseGateway: CourseGateway,
    ) {}

    async execute(userId: string, courseId: string): Promise<Enrollment> {
        const course = await this.courseGateway.findOne(courseId);
        if (!course) {
            throw new NotFoundException('Curso no encontrado');
        }

        const existing = await this.enrollmentGateway.findByUserAndCourse(userId, courseId);
        if (existing) {
            throw new ConflictException('Ya estás matriculado en este curso');
        }

        return this.enrollmentGateway.enroll(userId, courseId);
    }
}

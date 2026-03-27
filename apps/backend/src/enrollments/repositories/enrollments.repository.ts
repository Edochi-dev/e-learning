import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EnrollmentGateway } from '../gateways/enrollment.gateway';
import { Enrollment } from '../entities/enrollment.entity';

/**
 * EnrollmentsRepository -- Implementación concreta del EnrollmentGateway.
 *
 * Ahora solo inyecta Repository<Enrollment>. Antes inyectaba 3 repositorios
 * de TypeORM (Enrollment, LessonProgress, QuizAttempt) — una señal clara
 * de que estaba haciendo demasiado.
 *
 * Los métodos de progreso, video y quizzes ahora viven en sus propios repositorios.
 */
@Injectable()
export class EnrollmentsRepository implements EnrollmentGateway {
  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
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
   */
  async findByUserWithCourses(userId: string): Promise<Enrollment[]> {
    return this.enrollmentRepository.find({
      where: { userId },
      relations: ['course', 'course.lessons'],
      order: { enrolledAt: 'DESC' },
    });
  }

  async delete(id: string): Promise<void> {
    await this.enrollmentRepository.delete(id);
  }
}

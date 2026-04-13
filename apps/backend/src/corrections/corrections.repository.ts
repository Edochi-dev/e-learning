import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssignmentSubmission } from './entities/assignment-submission.entity';
import {
  CorrectionGateway,
  CreateSubmissionData,
  UpdateSubmissionData,
} from './gateways/correction.gateway';
import { PaginatedResult } from '../common/types/paginated-result.type';

/**
 * CorrectionsRepository — Implementación concreta del CorrectionGateway.
 *
 * Sigue el mismo patrón que CoursesRepository: implementa el contrato
 * abstracto usando TypeORM como adaptador de persistencia.
 */
@Injectable()
export class CorrectionsRepository implements CorrectionGateway {
  constructor(
    @InjectRepository(AssignmentSubmission)
    private readonly submissionRepository: Repository<AssignmentSubmission>,
  ) {}

  async findByStudentAndLesson(
    studentId: string,
    lessonId: string,
  ): Promise<AssignmentSubmission | null> {
    return this.submissionRepository.findOne({
      where: { studentId, lessonId },
    });
  }

  async findById(id: string): Promise<AssignmentSubmission | null> {
    return this.submissionRepository.findOne({
      where: { id },
      relations: ['student', 'lesson', 'lesson.course'],
    });
  }

  async create(data: CreateSubmissionData): Promise<AssignmentSubmission> {
    const submission = this.submissionRepository.create({
      studentId: data.studentId,
      lessonId: data.lessonId,
      photoUrl: data.photoUrl,
      status: 'pending',
    });
    return this.submissionRepository.save(submission);
  }

  async update(
    id: string,
    data: UpdateSubmissionData,
  ): Promise<AssignmentSubmission> {
    const submission = await this.submissionRepository.findOne({
      where: { id },
    });
    if (!submission) {
      throw new NotFoundException(`Submission with id ${id} not found`);
    }

    Object.assign(submission, data);
    return this.submissionRepository.save(submission);
  }

  async findPending(): Promise<AssignmentSubmission[]> {
    return this.submissionRepository.find({
      where: { status: 'pending' },
      relations: ['student', 'lesson', 'lesson.course'],
      order: { submittedAt: 'ASC' },
    });
  }

  /**
   * findAll — Búsqueda paginada con filtros para el histórico.
   *
   * Usa QueryBuilder en vez de find() porque necesitamos filtrar por:
   *   - courseId: vive en la tabla `lessons`, no en `assignment_submissions`
   *   - month/year: requiere EXTRACT() sobre `reviewedAt`
   *
   * Ambos son imposibles con el simple FindOptionsWhere de TypeORM.
   */
  async findAll(
    filters: {
      status?: string;
      excludeStatus?: string;
      lessonId?: string;
      studentId?: string;
      courseId?: string;
      month?: number;
      year?: number;
    },
    page: number,
    limit: number,
  ): Promise<PaginatedResult<AssignmentSubmission>> {
    const qb = this.submissionRepository
      .createQueryBuilder('sub')
      .leftJoinAndSelect('sub.student', 'student')
      .leftJoinAndSelect('sub.lesson', 'lesson')
      .leftJoinAndSelect('lesson.course', 'course')
      .orderBy('sub.reviewedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filters.status) {
      qb.andWhere('sub.status = :status', { status: filters.status });
    }
    if (filters.excludeStatus) {
      qb.andWhere('sub.status != :excludeStatus', {
        excludeStatus: filters.excludeStatus,
      });
    }
    if (filters.lessonId) {
      qb.andWhere('sub.lessonId = :lessonId', { lessonId: filters.lessonId });
    }
    if (filters.studentId) {
      qb.andWhere('sub.studentId = :studentId', {
        studentId: filters.studentId,
      });
    }
    if (filters.courseId) {
      qb.andWhere('lesson.courseId = :courseId', {
        courseId: filters.courseId,
      });
    }
    if (filters.month && filters.year) {
      qb.andWhere('EXTRACT(MONTH FROM sub.reviewedAt) = :month', {
        month: filters.month,
      });
      qb.andWhere('EXTRACT(YEAR FROM sub.reviewedAt) = :year', {
        year: filters.year,
      });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }
}

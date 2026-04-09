import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { AssignmentSubmission } from './entities/assignment-submission.entity';
import {
  CorrectionGateway,
  CreateSubmissionData,
  UpdateSubmissionData,
} from './gateways/correction.gateway';

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
      relations: ['student', 'lesson'],
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
      relations: ['student', 'lesson'],
      order: { submittedAt: 'ASC' },
    });
  }

  async findAll(filters?: {
    status?: string;
    lessonId?: string;
    studentId?: string;
  }): Promise<AssignmentSubmission[]> {
    const where: FindOptionsWhere<AssignmentSubmission> = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.lessonId) where.lessonId = filters.lessonId;
    if (filters?.studentId) where.studentId = filters.studentId;

    return this.submissionRepository.find({
      where,
      relations: ['student', 'lesson'],
      order: { submittedAt: 'DESC' },
    });
  }
}

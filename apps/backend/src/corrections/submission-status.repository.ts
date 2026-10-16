import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SubmissionState,
  SubmissionStatusGateway,
} from './gateways/submission-status.gateway';
import { AssignmentSubmission } from './entities/assignment-submission.entity';

@Injectable()
export class SubmissionStatusRepository implements SubmissionStatusGateway {
  constructor(
    @InjectRepository(AssignmentSubmission)
    private readonly submissions: Repository<AssignmentSubmission>,
  ) {}

  async statusesByCourse(
    studentId: string,
    courseId: string,
  ): Promise<Record<string, SubmissionState>> {
    const rows: { lessonId: string; status: SubmissionState }[] =
      await this.submissions.query(
        `SELECT s."lessonId", s."status"
         FROM assignment_submissions s
         JOIN lessons l ON l.id = s."lessonId"
         WHERE s."studentId" = $1 AND l."courseId" = $2`,
        [studentId, courseId],
      );
    return Object.fromEntries(rows.map((r) => [r.lessonId, r.status]));
  }
}

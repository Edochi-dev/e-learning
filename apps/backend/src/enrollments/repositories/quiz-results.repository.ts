import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuizResultsGateway } from '../gateways/quiz-results.gateway';
import { QuizAttempt } from '../entities/quiz-attempt.entity';

@Injectable()
export class QuizResultsRepository implements QuizResultsGateway {
  constructor(
    @InjectRepository(QuizAttempt)
    private readonly attempts: Repository<QuizAttempt>,
  ) {}

  async latestResultsByCourse(
    userId: string,
    courseId: string,
  ): Promise<Record<string, boolean>> {
    // DISTINCT ON keeps the newest attempt per quiz.
    const rows: { lessonId: string; passed: boolean }[] =
      await this.attempts.query(
        `SELECT DISTINCT ON (qa."lessonId") qa."lessonId", qa."passed"
         FROM quiz_attempts qa
         JOIN lessons l ON l.id = qa."lessonId"
         WHERE qa."userId" = $1 AND l."courseId" = $2
         ORDER BY qa."lessonId", qa."submittedAt" DESC`,
        [userId, courseId],
      );
    return Object.fromEntries(rows.map((r) => [r.lessonId, r.passed]));
  }
}

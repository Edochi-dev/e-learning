import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuizAttemptGateway } from '../gateways/quiz-attempt.gateway';
import { QuizAttempt } from '../entities/quiz-attempt.entity';

/**
 * QuizAttemptRepository -- Implementación concreta de QuizAttemptGateway.
 *
 * Solo inyecta Repository<QuizAttempt>. No sabe de matrículas ni de progreso.
 *
 * Nota: cascade: true en la entidad QuizAttempt hace que al guardar un attempt
 * con su array de answers, TypeORM inserte automáticamente las QuizAttemptAnswer.
 * No necesitamos inyectar un repositorio extra para eso.
 */
@Injectable()
export class QuizAttemptRepository implements QuizAttemptGateway {
  constructor(
    @InjectRepository(QuizAttempt)
    private readonly quizAttemptRepository: Repository<QuizAttempt>,
  ) {}

  async saveQuizAttempt(
    attempt: Partial<QuizAttempt>,
  ): Promise<QuizAttempt> {
    const entity = this.quizAttemptRepository.create(attempt);
    return this.quizAttemptRepository.save(entity);
  }

  /**
   * Busca el intento más reciente del alumno en este quiz.
   * ORDER BY submittedAt DESC + findOne = el último intento.
   */
  async getLastQuizAttempt(
    userId: string,
    lessonId: string,
  ): Promise<QuizAttempt | null> {
    return this.quizAttemptRepository.findOne({
      where: { userId, lessonId },
      order: { submittedAt: 'DESC' },
    });
  }
}

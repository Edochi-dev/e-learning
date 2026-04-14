import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuizAttemptGateway, CreateQuizAttemptData } from '../gateways/quiz-attempt.gateway';
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
    data: CreateQuizAttemptData,
  ): Promise<QuizAttempt> {
    const entity = this.quizAttemptRepository.create(data);
    return this.quizAttemptRepository.save(entity);
  }

  /**
   * Busca el intento más reciente del alumno en este quiz.
   * ORDER BY submittedAt DESC + findOne = el último intento.
   *
   * Cargamos también la relación `answers` para que el consumidor pueda
   * reconstruir los detalles del intento (qué opción eligió en cada
   * pregunta, si acertó, etc.). SubmitQuizUseCase no las usa pero el
   * overhead es mínimo y GetLastQuizAttemptUseCase sí las necesita.
   */
  async getLastQuizAttempt(
    userId: string,
    lessonId: string,
  ): Promise<QuizAttempt | null> {
    return this.quizAttemptRepository.findOne({
      where: { userId, lessonId },
      order: { submittedAt: 'DESC' },
      relations: ['answers'],
    });
  }
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { QuizAttempt } from './quiz-attempt.entity';

/**
 * QuizAttemptAnswer — La respuesta del alumno a UNA pregunta dentro de un intento.
 *
 * Guardamos:
 * - questionId: qué pregunta contestó
 * - selectedOptionId: qué opción eligió
 * - correct: si acertó o no (calculado por el backend al momento de evaluar)
 *
 * ¿Por qué guardar `correct` aquí si se puede recalcular?
 * Porque las preguntas/opciones pueden ser editadas o eliminadas por el admin
 * después del intento. Guardar el resultado congela la verdad al momento
 * de la evaluación — igual que `amount` en una Order congela el precio.
 */
@Entity('quiz_attempt_answers')
export class QuizAttemptAnswer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  questionId: string;

  @Column({ type: 'uuid' })
  selectedOptionId: string;

  @Column()
  correct: boolean;

  @Index()
  @ManyToOne(() => QuizAttempt, (a) => a.answers, { onDelete: 'CASCADE' })
  @JoinColumn({ foreignKeyConstraintName: 'FK_quiz_attempt_answer_attemptId' })
  attempt: QuizAttempt;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { QuizQuestion } from './quiz-question.entity';

/**
 * QuizOption — Una opción de respuesta dentro de una pregunta de quiz.
 *
 * Solo una opción por pregunta debe tener isCorrect = true.
 * Esta validación se hace en el DTO (backend) y en el QuizQuestionBuilder (frontend),
 * no a nivel de base de datos, porque una constraint de BD para "exactamente un true
 * por grupo" sería compleja y frágil.
 */
@Entity('quiz_options')
export class QuizOption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  text: string;

  @Column({ default: false })
  isCorrect: boolean;

  @Index()
  @ManyToOne(() => QuizQuestion, (q) => q.options, { onDelete: 'CASCADE' })
  @JoinColumn({ foreignKeyConstraintName: 'FK_quiz_option_questionId' })
  question: QuizQuestion;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Lesson } from '../../courses/entities/lessons.entity';
import { QuizAttemptAnswer } from './quiz-attempt-answer.entity';

/**
 * QuizAttempt — Un intento de un alumno al tomar un quiz.
 *
 * Guarda el resultado (score, passed) y el momento exacto (submittedAt).
 * submittedAt se usa para el cooldown de 30 minutos: si el último intento
 * fue hace menos de 30 min, el backend rechaza el nuevo intento.
 *
 * ¿Por qué no reutilizamos LessonProgress?
 * Porque LessonProgress es binario (completado o no), mientras que un quiz
 * tiene intentos múltiples con scores distintos. Son datos complementarios:
 * - QuizAttempt = historial de INTENTOS (puede haber muchos)
 * - LessonProgress = estado de COMPLETITUD (uno solo, se marca al aprobar)
 */
@Entity('quiz_attempts')
export class QuizAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @Index()
  @Column({ type: 'uuid' })
  lessonId: string;

  @Column({ type: 'int' })
  score: number;

  @Column()
  passed: boolean;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  submittedAt: Date;

  @OneToMany(() => QuizAttemptAnswer, (a) => a.attempt, { cascade: true })
  answers: QuizAttemptAnswer[];

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'FK_quiz_attempt_userId',
  })
  user: User;

  @ManyToOne(() => Lesson, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'lessonId',
    foreignKeyConstraintName: 'FK_quiz_attempt_lessonId',
  })
  lesson: Lesson;
}

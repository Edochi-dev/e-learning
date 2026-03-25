import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  Index,
  JoinColumn,
} from 'typeorm';
import { Lesson } from './lessons.entity';
import { QuizOption } from './quiz-option.entity';

/**
 * QuizQuestion — Una pregunta dentro de un examen (lección tipo 'exam').
 *
 * Relaciones:
 *   Lesson (exam) ─1:N─> QuizQuestion ─1:N─> QuizOption
 *
 * relatedLessonId apunta a la lección de video donde se explica el tema
 * de esta pregunta. Cuando el alumno falla, el frontend le muestra:
 * "Repasa: [título de esa lección]" como hint para que estudie.
 */
@Entity('quiz_questions')
export class QuizQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  text: string;

  @Column({ default: 0 })
  order: number;

  // FK a la lección de video relacionada (para el hint "Repasa lección X").
  // Nullable porque el admin puede no asignar una lección relacionada.
  @Column({ type: 'uuid', nullable: true })
  relatedLessonId: string;

  // cascade: true → al guardar una QuizQuestion con options[],
  // TypeORM guarda automáticamente las QuizOption.
  @OneToMany(() => QuizOption, (o) => o.question, { cascade: true })
  options: QuizOption[];

  @Index()
  @ManyToOne(() => Lesson, (lesson) => lesson.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ foreignKeyConstraintName: 'FK_quiz_question_lessonId' })
  lesson: Lesson;
}

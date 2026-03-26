import {
  Entity,
  PrimaryColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Lesson } from './lessons.entity';

/**
 * ExamLesson — Datos específicos de una lección tipo 'exam' (quiz).
 *
 * Mismo patrón que VideoLesson: tabla hija con el mismo ID que la lección padre.
 *
 * Las preguntas (QuizQuestion[]) no viven aquí — siguen relacionadas
 * directamente con la tabla `lessons` via FK. Esto es intencional:
 * el @OneToMany de questions está en la entidad base Lesson porque
 * TypeORM maneja mejor las relaciones desde la entidad que tiene el PK real.
 *
 * passingScore es NOT NULL porque todo examen DEBE tener un mínimo para aprobar.
 * No es nullable como era antes en la tabla lessons.
 */
@Entity('exam_lessons')
export class ExamLesson {
  @PrimaryColumn('uuid')
  lessonId: string;

  @Column({ type: 'int' })
  passingScore: number;

  @OneToOne(() => Lesson, (lesson) => lesson.examData, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'lessonId' })
  lesson: Lesson;
}

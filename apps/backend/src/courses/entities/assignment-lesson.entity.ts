import { Entity, PrimaryColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { Lesson } from './lessons.entity';

/**
 * AssignmentLesson — Datos específicos de una lección tipo 'correction' (tarea).
 *
 * Mismo patrón que VideoLesson y ExamLesson: tabla hija con el mismo
 * ID que la lección padre (Joined Table Inheritance manual).
 *
 * La profesora sube una imagen de referencia + instrucciones. La alumna
 * sube su foto del trabajo y espera aprobación. Los datos de la submission
 * de la alumna NO viven aquí — viven en el módulo `corrections/` (Fase 4).
 * Esta entidad solo representa la DEFINICIÓN de la tarea, no la entrega.
 *
 * referenceImageUrl: ruta a la foto de referencia (ej. el nail art ideal).
 * instructions: texto libre con las instrucciones del ejercicio.
 * Ambos son NOT NULL porque una tarea sin referencia ni instrucciones
 * no tiene sentido pedagógico.
 */
@Entity('assignment_lessons')
export class AssignmentLesson {
  @PrimaryColumn('uuid')
  lessonId: string;

  @Column()
  referenceImageUrl: string;

  @Column('text')
  instructions: string;

  @OneToOne(() => Lesson, (lesson) => lesson.assignmentData, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'lessonId' })
  lesson: Lesson;
}

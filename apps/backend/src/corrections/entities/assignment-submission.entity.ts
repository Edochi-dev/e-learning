import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Unique,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Lesson } from '../../courses/entities/lessons.entity';

/**
 * AssignmentSubmission — Entrega de una alumna para una lección tipo corrección.
 *
 * Modelo de datos:
 *   Una sola fila por (studentId, lessonId). La constraint @Unique garantiza
 *   esto a nivel de base de datos — si se intenta crear un segundo registro,
 *   PostgreSQL rechaza el INSERT.
 *
 * Re-envíos:
 *   Cuando la alumna re-envía, se ACTUALIZA la fila existente (nueva photoUrl,
 *   status vuelve a 'pending', submittedAt se renueva). No se crea una fila
 *   nueva — decisión de diseño para mantener el modelo simple y evitar
 *   historial ilimitado de fotos.
 *
 * Ciclo de vida del status:
 *   1. Alumna sube foto         → status = 'pending'
 *   2. Profesora aprueba        → status = 'approved', feedback obligatorio
 *   3. Profesora rechaza        → status = 'rejected', feedback obligatorio
 *   4. Alumna re-envía (si 3)   → status = 'pending' de nuevo
 *
 * Relaciones:
 *   - ManyToOne a User (la alumna que envió)
 *   - ManyToOne a Lesson (la lección tipo corrección)
 *   Ambas con onDelete: CASCADE — si se borra la alumna o la lección,
 *   la submission se borra automáticamente.
 */
@Entity('assignment_submissions')
@Unique(['studentId', 'lessonId'])
export class AssignmentSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  studentId: string;

  @Column('uuid')
  lessonId: string;

  @Column()
  photoUrl: string;

  @Column({ default: 'pending' })
  status: string;

  @Column({ type: 'text', nullable: true })
  feedback: string | null;

  @CreateDateColumn()
  submittedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  // ── Relaciones ──────────────────────────────────────────────────────

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @ManyToOne(() => Lesson, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lessonId' })
  lesson: Lesson;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * NameChangeRequest — Solicitud de un alumno para cambiar su nombre.
 *
 * ¿Por qué existe esta entidad?
 *   El nombre del alumno aparece en sus certificados. Si pudiera cambiarlo
 *   libremente, podría emitir certificados con varios nombres (fraude). Por eso
 *   el cambio pasa por una SOLICITUD que un admin aprueba o rechaza.
 *
 * Ciclo de vida del status (mismo patrón que AssignmentSubmission):
 *   1. Alumno solicita   → status = 'pending'
 *   2. Admin aprueba     → status = 'approved'  (se aplica requestedName al User)
 *   3. Admin rechaza     → status = 'rejected'  (feedback con el motivo)
 *
 * Guardamos `currentName` como snapshot: deja un audit trail de cuál era el
 * nombre en el momento de la solicitud, aunque el User cambie después.
 *
 * Relación ManyToOne a User con onDelete: CASCADE — si se borra el usuario,
 * sus solicitudes se borran solas.
 */
@Entity('name_change_requests')
export class NameChangeRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column()
  currentName: string;

  @Column()
  requestedName: string;

  @Column({ default: 'pending' })
  status: string;

  @Column({ type: 'text', nullable: true })
  feedback: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}

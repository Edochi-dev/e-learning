import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { InvitationStatus } from '@maris-nails/shared';
import { User } from '../../users/entities/user.entity';
import { Course } from '../../courses/entities/course.entity';

/**
 * CourseInvitation — Enlace de un solo uso que da acceso a un curso.
 *
 * La profesora vende por fuera (WhatsApp) y reparte un enlace por alumna. Cada
 * enlace sirve UNA vez: quien lo abre crea su cuenta con su propio nombre y su
 * propia clave, sin que nadie tenga que pedir datos por chat ni dar de alta a
 * mano.
 *
 * Seguridad, calcada de PasswordResetToken:
 *   - Se guarda el sha256 del token, nunca el token en claro. Si se filtra la
 *     base de datos, los enlaces no son utilizables.
 *   - El token en claro existe solo en el enlace que la profesora envía.
 *
 * Dos relojes distintos, y no hay que confundirlos:
 *   - `expiresAt` es la vigencia del ENLACE, y corre desde que se genera.
 *   - La duración del ACCESO cuenta desde el canje (Course.accessDurationDays).
 *     Si fueran el mismo, quien canjea el día 25 de 30 recibiría 5 días de un
 *     curso que pagó por 30.
 */
@Entity('course_invitations')
export class CourseInvitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // unique crea además el índice por el que se busca al canjear.
  @Column({ unique: true })
  tokenHash: string;

  @Column({ type: 'uuid' })
  courseId: string;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  /** Hasta cuándo sirve el ENLACE (no el acceso que otorga). */
  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  redeemedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  redeemedByUserId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'redeemedByUserId' })
  redeemedBy: User | null;

  /** Revocación manual: la profesora anula un enlace que repartió por error. */
  @Column({ type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @Column({ type: 'uuid' })
  createdByUserId: string;

  /**
   * Nota privada de la profesora ("María — grupo de marzo"). Le permite saber a
   * quién dio cada enlace sin que el sistema guarde datos personales de alguien
   * que todavía no tiene cuenta.
   */
  @Column({ type: 'varchar', nullable: true })
  label: string | null;

  @CreateDateColumn()
  createdAt: Date;

  /**
   * Único sitio donde se decide si un enlace sirve, y por qué no.
   *
   * El orden importa: canjeado y revocado se comprueban antes que la
   * caducidad, porque un enlace ya usado sigue estando usado aunque además
   * haya caducado, y ese es el mensaje útil para quien lo abre.
   */
  status(now: Date = new Date()): InvitationStatus {
    if (this.redeemedAt) return InvitationStatus.REDEEMED;
    if (this.revokedAt) return InvitationStatus.REVOKED;
    if (this.expiresAt.getTime() <= now.getTime()) {
      return InvitationStatus.EXPIRED;
    }
    return InvitationStatus.VALID;
  }

  isRedeemable(now: Date = new Date()): boolean {
    return this.status(now) === InvitationStatus.VALID;
  }
}

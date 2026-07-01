import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

/**
 * PasswordResetToken — Token de un solo uso para restablecer la contraseña.
 *
 * Seguridad:
 *   - Guardamos el HASH (sha256) del token, nunca el token en claro. Igual que
 *     con las contraseñas: si se filtra la DB, los tokens no son utilizables.
 *   - `expiresAt` limita la ventana de validez (lo fijamos a 1 hora).
 *   - `usedAt` marca el uso: un token consumido no vuelve a servir.
 *
 * El token en claro solo existe en el enlace que se envía por email al alumno.
 */
@Entity('password_reset_tokens')
export class PasswordResetToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // sha256 del token en claro. Indexado para buscar rápido en el reset.
  @Index()
  @Column()
  tokenHash: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  usedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}

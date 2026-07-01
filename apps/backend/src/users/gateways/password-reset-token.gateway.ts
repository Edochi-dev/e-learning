import { PasswordResetToken } from '../entities/password-reset-token.entity';

/**
 * PasswordResetTokenGateway — Contrato para persistir/consultar tokens de
 * restablecimiento. Los use-cases dependen de esta abstracción, no de TypeORM.
 */
export abstract class PasswordResetTokenGateway {
  abstract create(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<PasswordResetToken>;

  /** Token con ese hash que NO haya sido usado y NO haya expirado; si no, null. */
  abstract findValidByHash(
    tokenHash: string,
  ): Promise<PasswordResetToken | null>;

  abstract markUsed(id: string): Promise<void>;

  /** Borra los tokens del usuario (para mantener uno activo a la vez). */
  abstract deleteByUserId(userId: string): Promise<void>;
}

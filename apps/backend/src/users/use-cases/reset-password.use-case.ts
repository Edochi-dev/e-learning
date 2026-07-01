import { Injectable, BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import { UserGateway } from '../gateways/user.gateway';
import { PasswordResetTokenGateway } from '../gateways/password-reset-token.gateway';

/**
 * ResetPasswordUseCase — Paso 2 del "olvidé mi contraseña".
 *
 * Recibe el token en claro (del enlace) y la nueva contraseña. Reconstruye el
 * hash, busca un token VÁLIDO (no usado, no expirado), cambia la contraseña
 * (bcrypt) y marca el token como usado para que no se pueda reutilizar.
 */
@Injectable()
export class ResetPasswordUseCase {
  constructor(
    private readonly userGateway: UserGateway,
    private readonly tokenGateway: PasswordResetTokenGateway,
  ) {}

  async execute(token: string, newPassword: string): Promise<void> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const record = await this.tokenGateway.findValidByHash(tokenHash);
    if (!record) {
      throw new BadRequestException(
        'El enlace de restablecimiento es inválido o expiró. Solicita uno nuevo.',
      );
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await this.userGateway.updatePassword(record.userId, hashedPassword);

    // Un solo uso: consumido, ya no sirve.
    await this.tokenGateway.markUsed(record.id);
  }
}

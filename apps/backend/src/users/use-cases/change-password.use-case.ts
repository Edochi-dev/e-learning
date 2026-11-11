import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserGateway } from '../gateways/user.gateway';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { AuthSessionGateway } from '../gateways/auth-session.gateway';

@Injectable()
export class ChangePasswordUseCase {
  constructor(
    private readonly userGateway: UserGateway,
    private readonly sessions: AuthSessionGateway,
  ) {}

  async execute(
    userId: string,
    currentSessionId: string,
    dto: ChangePasswordDto,
  ): Promise<void> {
    // 1. Buscar al usuario (necesitamos el hash actual para verificar)
    const user = await this.userGateway.findOne(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // 2. Verificar que la contraseña actual sea correcta
    const isCurrentValid = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );
    if (!isCurrentValid) {
      throw new UnauthorizedException('La contraseña actual es incorrecta');
    }

    // 3. Hashear la nueva contraseña y guardar
    const salt = await bcrypt.genSalt(10);
    const hashedNew = await bcrypt.hash(dto.newPassword, salt);

    await this.userGateway.updatePassword(userId, hashedNew);
    // Anyone signed in with the old password is out; this device stays in.
    await this.sessions.revokeAllForUser(userId, currentSessionId);
  }
}

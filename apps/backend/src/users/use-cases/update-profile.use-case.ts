import { Injectable } from '@nestjs/common';
import { User } from '../entities/user.entity';
import { UserGateway } from '../gateways/user.gateway';

/**
 * UpdateProfileUseCase — Actualiza los datos editables del perfil del alumno.
 *
 * Devuelve el usuario ya actualizado para que el frontend refresque su estado
 * de sesión (el nombre aparece en el avatar, el saludo, etc.) sin recargar.
 */
@Injectable()
export class UpdateProfileUseCase {
  constructor(private readonly userGateway: UserGateway) {}

  async execute(userId: string, fullName: string): Promise<User> {
    return this.userGateway.updateProfile(userId, fullName);
  }
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserGateway } from '../gateways/user.gateway';
import {
  AuthSessionService,
  SessionTokens,
} from '../services/auth-session.service';
import { LoginUserDto } from '../dto/login-user.dto';
import { User } from '../entities/user.entity';

@Injectable()
export class LoginUserUseCase {
  constructor(
    private readonly userGateway: UserGateway,
    private readonly sessionService: AuthSessionService,
  ) {}

  async execute(
    dto: LoginUserDto,
    userAgent: string | null,
  ): Promise<{ user: User; tokens: SessionTokens }> {
    const user = await this.userGateway.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.sessionService.start(user, userAgent);
    return { user, tokens };
  }
}

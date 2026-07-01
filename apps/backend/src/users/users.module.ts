import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { User } from './entities/user.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { UsersService } from './users.service';
import { UserGateway } from './gateways/user.gateway';
import { PasswordResetTokenGateway } from './gateways/password-reset-token.gateway';
import { PasswordResetTokenRepository } from './password-reset-token.repository';
import { UsersController } from './users.controller';
import { RegisterUserUseCase } from './use-cases/register-user.use-case';
import { LoginUserUseCase } from './use-cases/login-user.use-case';
import { FindAllUsersUseCase } from './use-cases/find-all-users.use-case';
import { ChangePasswordUseCase } from './use-cases/change-password.use-case';
import { UpdateProfileUseCase } from './use-cases/update-profile.use-case';
import { RequestPasswordResetUseCase } from './use-cases/request-password-reset.use-case';
import { ResetPasswordUseCase } from './use-cases/reset-password.use-case';
import { TokenGateway } from './gateways/token.gateway';
import { JwtTokenService } from './jwt-token.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, PasswordResetToken]),
    NotificationsModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
    }),
  ],
  controllers: [UsersController],
  providers: [
    // Bindings Clean Architecture: abstract → concrete
    // Los use cases inyectan el gateway abstracto, nunca la clase concreta
    { provide: UserGateway, useClass: UsersService },
    {
      provide: PasswordResetTokenGateway,
      useClass: PasswordResetTokenRepository,
    },
    { provide: TokenGateway, useClass: JwtTokenService },
    // Estrategia de Passport (necesita estar aquí para que NestJS la registre)
    JwtStrategy,
    // Casos de uso
    RegisterUserUseCase,
    LoginUserUseCase,
    FindAllUsersUseCase,
    ChangePasswordUseCase,
    UpdateProfileUseCase,
    RequestPasswordResetUseCase,
    ResetPasswordUseCase,
  ],
  exports: [UserGateway],
})
export class UsersModule {}

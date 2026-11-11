import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { User } from './entities/user.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { AuthSession } from './entities/auth-session.entity';
import { AuthSessionGateway } from './gateways/auth-session.gateway';
import { AuthSessionRepository } from './auth-session.repository';
import { AuthSessionService } from './services/auth-session.service';
import { ACCESS_TOKEN_TTL_SECONDS } from './services/session-policy';
import { SessionCleanupCron } from './session-cleanup.cron';
import { RefreshSessionUseCase } from './use-cases/refresh-session.use-case';
import { LogoutUseCase } from './use-cases/logout.use-case';
import { RevokeAllSessionsUseCase } from './use-cases/revoke-all-sessions.use-case';
import { UsersService } from './users.service';
import { UserGateway } from './gateways/user.gateway';
import { AlertRecipientsGateway } from './gateways/alert-recipients.gateway';
import { AlertRecipientsRepository } from './alert-recipients.repository';
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
    TypeOrmModule.forFeature([User, PasswordResetToken, AuthSession]),
    NotificationsModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: ACCESS_TOKEN_TTL_SECONDS },
      }),
    }),
  ],
  controllers: [UsersController],
  providers: [
    // Bindings Clean Architecture: abstract → concrete
    // Los use cases inyectan el gateway abstracto, nunca la clase concreta
    { provide: UserGateway, useClass: UsersService },
    { provide: AlertRecipientsGateway, useClass: AlertRecipientsRepository },
    {
      provide: PasswordResetTokenGateway,
      useClass: PasswordResetTokenRepository,
    },
    { provide: TokenGateway, useClass: JwtTokenService },
    { provide: AuthSessionGateway, useClass: AuthSessionRepository },
    AuthSessionService,
    SessionCleanupCron,
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
    RefreshSessionUseCase,
    LogoutUseCase,
    RevokeAllSessionsUseCase,
  ],
  exports: [UserGateway, AlertRecipientsGateway, AuthSessionService],
})
export class UsersModule {}

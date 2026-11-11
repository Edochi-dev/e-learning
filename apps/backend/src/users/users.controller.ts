import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Req,
  Res,
  Headers,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CreateUserDto } from './dto/create-user.dto';
import { RegisterUserUseCase } from './use-cases/register-user.use-case';
import { LoginUserDto } from './dto/login-user.dto';
import { LoginUserUseCase } from './use-cases/login-user.use-case';
import { ChangePasswordUseCase } from './use-cases/change-password.use-case';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileUseCase } from './use-cases/update-profile.use-case';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { RequestPasswordResetUseCase } from './use-cases/request-password-reset.use-case';
import { ResetPasswordUseCase } from './use-cases/reset-password.use-case';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { User } from './entities/user.entity';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '@maris-nails/shared';
import { FindAllUsersUseCase } from './use-cases/find-all-users.use-case';
import { RefreshSessionUseCase } from './use-cases/refresh-session.use-case';
import { LogoutUseCase } from './use-cases/logout.use-case';
import { RevokeAllSessionsUseCase } from './use-cases/revoke-all-sessions.use-case';
import {
  REFRESH_TOKEN_COOKIE,
  clearSessionCookies,
  setSessionCookies,
} from './auth-cookies';
import type { AuthenticatedUser } from './authenticated-user';

function refreshTokenFrom(req: Request): string | undefined {
  return req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
}

@Controller('users')
export class UsersController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly loginUserUseCase: LoginUserUseCase,
    private readonly findAllUsersUseCase: FindAllUsersUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
    private readonly requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly refreshSessionUseCase: RefreshSessionUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly revokeAllSessionsUseCase: RevokeAllSessionsUseCase,
  ) {}

  // Máximo 5 registros por minuto por IP para frenar registro masivo
  @Post()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.registerUserUseCase.execute(createUserDto);
  }

  // Máximo 10 intentos de login por minuto por IP para frenar brute force
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async login(
    @Body() loginUserDto: LoginUserDto,
    @Headers('user-agent') userAgent: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: User }> {
    const { user, tokens } = await this.loginUserUseCase.execute(
      loginUserDto,
      userAgent ?? null,
    );
    setSessionCookies(res, tokens);
    return { user };
  }

  // Called by the frontend whenever a request comes back 401. The limit is
  // generous because every open tab refreshes on its own.
  @Post('refresh')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    try {
      setSessionCookies(
        res,
        await this.refreshSessionUseCase.execute(refreshTokenFrom(req)),
      );
    } catch (error) {
      clearSessionCookies(res);
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.logoutUseCase.execute(refreshTokenFrom(req));
    clearSessionCookies(res);
  }

  @Post('me/sessions/revoke-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard('jwt'))
  async revokeAllSessions(
    @Req() req: { user: AuthenticatedUser },
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.revokeAllSessionsUseCase.execute(req.user.id);
    clearSessionCookies(res);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  me(@Req() req: { user: AuthenticatedUser }): User {
    return req.user;
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard('jwt'))
  async changePassword(
    @Req() req: { user: AuthenticatedUser },
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.changePasswordUseCase.execute(
      req.user.id,
      req.user.sessionId,
      dto,
    );
  }

  // Cambio de nombre DIRECTO: SOLO admin (override).
  // Los alumnos ya NO cambian su nombre libremente — eso permitiría fraude de
  // certificados (varios nombres). Deben usar el flujo de solicitud con
  // aprobación (NameChangeRequestsModule → POST /name-change-requests).
  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateName(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<User> {
    return this.updateProfileUseCase.execute(id, dto.fullName);
  }

  // Paso 1 del reset. Responde 204 SIEMPRE (exista o no el email) para no
  // revelar qué correos están registrados. Rate-limited contra abuso.
  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    await this.requestPasswordResetUseCase.execute(dto.email);
  }

  // Paso 2 del reset: aplica la nueva contraseña usando el token del enlace.
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.resetPasswordUseCase.execute(dto.token, dto.newPassword);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  async findAll(): Promise<User[]> {
    return this.findAllUsersUseCase.execute();
  }
}

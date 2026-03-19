import {
  Controller,
  Post,
  Body,
  Patch,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { CreateUserDto } from './dto/create-user.dto';
import { RegisterUserUseCase } from './use-cases/register-user.use-case';
import { LoginUserDto } from './dto/login-user.dto';
import { LoginUserUseCase } from './use-cases/login-user.use-case';
import { ChangePasswordUseCase } from './use-cases/change-password.use-case';
import { ChangePasswordDto } from './dto/change-password.dto';
import { User } from './entities/user.entity';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '@maris-nails/shared';
import { FindAllUsersUseCase } from './use-cases/find-all-users.use-case';

/** Opciones de la cookie HttpOnly que transporta el JWT. */
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 1000, // 1 hora — mismo TTL que el JWT
};

@Controller('users')
export class UsersController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly loginUserUseCase: LoginUserUseCase,
    private readonly findAllUsersUseCase: FindAllUsersUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
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
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: User }> {
    const { user, token } = await this.loginUserUseCase.execute(loginUserDto);
    res.cookie('access_token', token, COOKIE_OPTIONS);
    return { user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Res({ passthrough: true }) res: Response): Promise<void> {
    res.clearCookie('access_token', COOKIE_OPTIONS);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async me(@Req() req: any): Promise<User> {
    return req.user;
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard('jwt'))
  async changePassword(
    @Req() req: any,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.changePasswordUseCase.execute(req.user.id, dto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  async findAll(): Promise<User[]> {
    return this.findAllUsersUseCase.execute();
  }
}

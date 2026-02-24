import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { CreateUserDto } from './dto/create-user.dto';
import { RegisterUserUseCase } from './use-cases/register-user.use-case';
import { LoginUserDto } from './dto/login-user.dto';
import { LoginUserUseCase } from './use-cases/login-user.use-case';
import { User } from './entities/user.entity';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '@maris-nails/shared';
import { FindAllUsersUseCase } from './use-cases/find-all-users.use-case';

@Controller('users')
export class UsersController {
    constructor(
        private readonly registerUserUseCase: RegisterUserUseCase,
        private readonly loginUserUseCase: LoginUserUseCase,
        private readonly findAllUsersUseCase: FindAllUsersUseCase,
    ) { }

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
    async login(@Body() loginUserDto: LoginUserDto): Promise<{ user: User; token: string }> {
        return this.loginUserUseCase.execute(loginUserDto);
    }

    @Get('me')
    @UseGuards(AuthGuard('jwt'))
    async me(@Req() req: any): Promise<User> {
        return req.user;
    }

    @Get()
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles(UserRole.ADMIN)
    async findAll(): Promise<User[]> {
        return this.findAllUsersUseCase.execute();
    }
}

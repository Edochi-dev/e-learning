import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { RegisterUserUseCase } from './use-cases/register-user.use-case';
import { LoginUserDto } from './dto/login-user.dto';
import { LoginUserUseCase } from './use-cases/login-user.use-case';
import { User } from './entities/user.entity';

@Controller('users')
export class UsersController {
    constructor(
        private readonly registerUserUseCase: RegisterUserUseCase,
        private readonly loginUserUseCase: LoginUserUseCase,
    ) { }

    @Post()
    async create(@Body() createUserDto: CreateUserDto): Promise<User> {
        return this.registerUserUseCase.execute(createUserDto);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() loginUserDto: LoginUserDto): Promise<User> {
        return this.loginUserUseCase.execute(loginUserDto);
    }
}

import { Controller, Post, Body } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { RegisterUserUseCase } from './use-cases/register-user.use-case';
import { User } from './entities/user.entity';

@Controller('users')
export class UsersController {
    constructor(private readonly registerUserUseCase: RegisterUserUseCase) { }

    @Post()
    async create(@Body() createUserDto: CreateUserDto): Promise<User> {
        return this.registerUserUseCase.execute(createUserDto);
    }
}

import { Injectable, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { UserRole } from '@maris-nails/shared';
import { UserGateway } from '../gateways/user.gateway';
import { CreateUserDto } from '../dto/create-user.dto';

@Injectable()
export class RegisterUserUseCase {
    constructor(private readonly userGateway: UserGateway) { }

    async execute(dto: CreateUserDto): Promise<User> {
        const existingUser = await this.userGateway.findByEmail(dto.email);
        if (existingUser) {
            throw new ConflictException('User already exists');
        }

        const newUser = new User();
        newUser.email = dto.email;
        newUser.fullName = dto.fullName;

        // Encriptar contraseña (con 10 salt rounds)
        const salt = await bcrypt.genSalt(10);
        newUser.password = await bcrypt.hash(dto.password, salt);

        newUser.role = UserRole.STUDENT;

        return this.userGateway.create(newUser);
    }
}

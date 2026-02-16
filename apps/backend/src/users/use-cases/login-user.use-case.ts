import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserGateway } from '../gateways/user.gateway';
import { LoginUserDto } from '../dto/login-user.dto';
import { User } from '../entities/user.entity';

@Injectable()
export class LoginUserUseCase {
    constructor(private readonly userGateway: UserGateway) { }

    async execute(dto: LoginUserDto): Promise<User> {
        const user = await this.userGateway.findByEmail(dto.email);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Retornamos el usuario (idealmente sin la contraseña, pero eso se puede manejar en un interceptor o DTO de salida)
        return user;
    }
}

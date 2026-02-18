import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserGateway } from '../gateways/user.gateway';
import { TokenGateway } from '../gateways/token.gateway';
import { LoginUserDto } from '../dto/login-user.dto';
import { User } from '../entities/user.entity';

@Injectable()
export class LoginUserUseCase {
    constructor(
        private readonly userGateway: UserGateway,
        private readonly tokenGateway: TokenGateway,
    ) { }

    async execute(dto: LoginUserDto): Promise<{ user: User; token: string }> {
        const user = await this.userGateway.findByEmail(dto.email);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            fullName: user.fullName
        };
        const token = this.tokenGateway.sign(payload);

        return { user, token };
    }
}

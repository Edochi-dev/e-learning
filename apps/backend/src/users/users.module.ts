import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UserGateway } from './gateways/user.gateway';
import { UsersController } from './users.controller';
import { RegisterUserUseCase } from './use-cases/register-user.use-case';
import { LoginUserUseCase } from './use-cases/login-user.use-case';
import { TokenGateway } from './gateways/token.gateway';
import { JwtTokenService } from './jwt-token.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([User]),
        JwtModule.register({
            secret: 'temporary_secret', // TODO: Mover a .env
            signOptions: { expiresIn: '1h' },
        }),
    ],
    controllers: [UsersController],
    providers: [
        {
            provide: UserGateway,
            useClass: UsersService,
        },
        {
            provide: TokenGateway,
            useClass: JwtTokenService,
        },
        RegisterUserUseCase,
        LoginUserUseCase,
        JwtTokenService,
        UsersService,
    ],
    exports: [UserGateway],
})
export class UsersModule { }

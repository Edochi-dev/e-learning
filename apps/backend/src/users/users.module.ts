import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UserGateway } from './gateways/user.gateway';
import { UsersController } from './users.controller';
import { RegisterUserUseCase } from './use-cases/register-user.use-case';
import { LoginUserUseCase } from './use-cases/login-user.use-case';
import { FindAllUsersUseCase } from './use-cases/find-all-users.use-case';
import { TokenGateway } from './gateways/token.gateway';
import { JwtTokenService } from './jwt-token.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
    imports: [
        TypeOrmModule.forFeature([User]),
        PassportModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get('JWT_SECRET'),
                signOptions: { expiresIn: '1h' },
            }),
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
        JwtStrategy,
        RegisterUserUseCase,
        JwtStrategy,
        RegisterUserUseCase,
        LoginUserUseCase,
        FindAllUsersUseCase, // Nuevo caso de uso
        JwtTokenService,
        UsersService,
    ],
    exports: [UserGateway],
})
export class UsersModule { }

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UserGateway } from './gateways/user.gateway';

@Module({
    imports: [TypeOrmModule.forFeature([User])],
    providers: [
        {
            provide: UserGateway,
            useClass: UsersService,
        },
        // Si necesitas usar UsersService directamente en algún lado, también puedes proveerlo,
        // pero idealmente deberías inyectar UserGateway.
        UsersService,
    ],
    exports: [UserGateway], // Exportamos el Gateway para que otros módulos lo usen
})
export class UsersModule { }

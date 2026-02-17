import { Injectable } from '@nestjs/common';
import { UserGateway } from '../gateways/user.gateway';
import { User } from '../entities/user.entity';

@Injectable()
export class FindAllUsersUseCase {
    constructor(private readonly userGateway: UserGateway) { }

    async execute(): Promise<User[]> {
        return this.userGateway.findAll();
    }
}

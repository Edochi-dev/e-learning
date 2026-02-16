import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserGateway } from './gateways/user.gateway';

@Injectable()
export class UsersService implements UserGateway {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) { }

    async create(user: User): Promise<User> {
        return this.userRepository.save(user);
    }

    async findAll(): Promise<User[]> {
        return this.userRepository.find();
    }

    async findOne(id: string): Promise<User | null> {
        return this.userRepository.findOneBy({ id });
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.userRepository.findOneBy({ email });
    }
}

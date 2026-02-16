import { User } from '../entities/user.entity';

export abstract class UserGateway {
    abstract create(user: User): Promise<User>;
    abstract findAll(): Promise<User[]>;
    abstract findOne(id: string): Promise<User | null>;
    abstract findByEmail(email: string): Promise<User | null>;
}

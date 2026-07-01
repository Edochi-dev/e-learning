import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NameChangeRequest } from './entities/name-change-request.entity';
import {
  NameChangeRequestGateway,
  CreateNameChangeRequestData,
  UpdateNameChangeRequestData,
} from './gateways/name-change-request.gateway';

/**
 * NameChangeRequestsRepository — Implementación TypeORM del gateway.
 *
 * Mismo patrón que CorrectionsRepository: adapta el contrato abstracto a la
 * persistencia concreta. Los use cases no conocen esta clase.
 */
@Injectable()
export class NameChangeRequestsRepository implements NameChangeRequestGateway {
  constructor(
    @InjectRepository(NameChangeRequest)
    private readonly repo: Repository<NameChangeRequest>,
  ) {}

  async create(data: CreateNameChangeRequestData): Promise<NameChangeRequest> {
    const entity = this.repo.create({
      userId: data.userId,
      currentName: data.currentName,
      requestedName: data.requestedName,
      status: 'pending',
    });
    return this.repo.save(entity);
  }

  async findById(id: string): Promise<NameChangeRequest | null> {
    // Cargamos la relación user: el use case de review necesita user.email.
    return this.repo.findOne({ where: { id }, relations: ['user'] });
  }

  async update(
    id: string,
    data: UpdateNameChangeRequestData,
  ): Promise<NameChangeRequest> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`Name change request ${id} not found`);
    }
    Object.assign(entity, data);
    return this.repo.save(entity);
  }

  async findPending(): Promise<NameChangeRequest[]> {
    return this.repo.find({
      where: { status: 'pending' },
      relations: ['user'],
      order: { createdAt: 'ASC' }, // FIFO: la más antigua primero
    });
  }

  async findLatestByUser(userId: string): Promise<NameChangeRequest | null> {
    return this.repo.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}

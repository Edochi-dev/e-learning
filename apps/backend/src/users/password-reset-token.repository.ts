import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThan } from 'typeorm';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { PasswordResetTokenGateway } from './gateways/password-reset-token.gateway';

/**
 * Implementación TypeORM del PasswordResetTokenGateway.
 * Único archivo del flujo de reset que conoce la persistencia.
 */
@Injectable()
export class PasswordResetTokenRepository implements PasswordResetTokenGateway {
  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly repo: Repository<PasswordResetToken>,
  ) {}

  async create(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<PasswordResetToken> {
    return this.repo.save(this.repo.create(data));
  }

  async findValidByHash(tokenHash: string): Promise<PasswordResetToken | null> {
    return this.repo.findOne({
      where: {
        tokenHash,
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
    });
  }

  async markUsed(id: string): Promise<void> {
    await this.repo.update(id, { usedAt: new Date() });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.repo.delete({ userId });
  }
}

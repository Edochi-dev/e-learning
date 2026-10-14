import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, MoreThan, Not, Repository } from 'typeorm';
import { AuthSession } from './entities/auth-session.entity';
import {
  AuthSessionGateway,
  NewAuthSession,
} from './gateways/auth-session.gateway';

@Injectable()
export class AuthSessionRepository implements AuthSessionGateway {
  constructor(
    @InjectRepository(AuthSession)
    private readonly repo: Repository<AuthSession>,
  ) {}

  async create(data: NewAuthSession): Promise<AuthSession> {
    return this.repo.save(
      this.repo.create({ ...data, lastUsedAt: new Date() }),
    );
  }

  async findByRefreshTokenHash(hash: string): Promise<AuthSession | null> {
    return this.repo.findOne({
      where: [{ refreshTokenHash: hash }, { previousRefreshTokenHash: hash }],
    });
  }

  async rotate(
    id: string,
    expectedHash: string,
    newHash: string,
    expiresAt: Date,
  ): Promise<boolean> {
    const now = new Date();
    const result = await this.repo.update(
      { id, refreshTokenHash: expectedHash, revokedAt: IsNull() },
      {
        refreshTokenHash: newHash,
        previousRefreshTokenHash: expectedHash,
        rotatedAt: now,
        lastUsedAt: now,
        expiresAt,
      },
    );
    return result.affected === 1;
  }

  async isActive(id: string, userId: string): Promise<boolean> {
    return this.repo.exists({
      where: {
        id,
        userId,
        revokedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
    });
  }

  async revoke(id: string): Promise<void> {
    await this.repo.update(
      { id, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async revokeAllForUser(userId: string, exceptId?: string): Promise<void> {
    await this.repo.update(
      {
        userId,
        revokedAt: IsNull(),
        ...(exceptId ? { id: Not(exceptId) } : {}),
      },
      { revokedAt: new Date() },
    );
  }

  async deleteStale(cutoff: Date): Promise<number> {
    const result = await this.repo.delete([
      { expiresAt: LessThan(cutoff) },
      { revokedAt: LessThan(cutoff) },
    ]);
    return result.affected ?? 0;
  }
}

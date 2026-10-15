import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { EmailOutboxMessage } from './entities/email-outbox-message.entity';
import { EmailOutboxStatus } from './domain/email-outbox-status';
import { EmailMessage } from './domain/email-message';
import { EmailPriority } from './domain/email-priority';
import { EmailOutboxWriter } from './gateways/email-outbox-writer.gateway';
import { EmailOutboxQueue } from './gateways/email-outbox-queue.gateway';

const MAX_ERROR_LENGTH = 2000;

@Injectable()
export class EmailOutboxRepository
  implements EmailOutboxWriter, EmailOutboxQueue
{
  constructor(
    @InjectRepository(EmailOutboxMessage)
    private readonly repo: Repository<EmailOutboxMessage>,
  ) {}

  async enqueue(message: EmailMessage, priority: EmailPriority): Promise<void> {
    await this.repo.insert({
      recipient: message.to,
      subject: message.subject,
      body: message.body,
      priority,
    });
  }

  // SKIP LOCKED: an overlapping claim skips the rows this one is taking
  // instead of waiting for them and then sending them a second time.
  async claimDue(limit: number, now: Date): Promise<EmailOutboxMessage[]> {
    const [rows]: [{ id: string }[], number] = await this.repo.query(
      `UPDATE "email_outbox"
          SET "status" = $1, "attempts" = "attempts" + 1, "updatedAt" = now()
        WHERE "id" IN (
          SELECT "id" FROM "email_outbox"
           WHERE "status" = $2 AND "nextAttemptAt" <= $4
           ORDER BY "priority", "createdAt"
           LIMIT $3
           FOR UPDATE SKIP LOCKED
        )
        RETURNING "id"`,
      [EmailOutboxStatus.SENDING, EmailOutboxStatus.PENDING, limit, now],
    );
    if (rows.length === 0) return [];
    return this.repo.find({
      where: { id: In(rows.map((row) => row.id)) },
      order: { priority: 'ASC', createdAt: 'ASC' },
    });
  }

  async markSent(id: string, provider: string): Promise<void> {
    await this.repo.update(
      { id, status: EmailOutboxStatus.SENDING },
      {
        status: EmailOutboxStatus.SENT,
        provider,
        sentAt: new Date(),
        lastError: null,
      },
    );
  }

  async scheduleRetry(
    id: string,
    nextAttemptAt: Date,
    error: string,
  ): Promise<void> {
    await this.repo.update(
      { id, status: EmailOutboxStatus.SENDING },
      {
        status: EmailOutboxStatus.PENDING,
        nextAttemptAt,
        lastError: error.slice(0, MAX_ERROR_LENGTH),
      },
    );
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.repo.update(
      { id, status: EmailOutboxStatus.SENDING },
      {
        status: EmailOutboxStatus.FAILED,
        lastError: error.slice(0, MAX_ERROR_LENGTH),
      },
    );
  }

  async requeueInterrupted(): Promise<number> {
    const result = await this.repo.update(
      { status: EmailOutboxStatus.SENDING },
      { status: EmailOutboxStatus.PENDING },
    );
    return result.affected ?? 0;
  }
}

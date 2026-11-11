import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '@maris-nails/shared';
import { User } from './entities/user.entity';
import { AlertRecipientsGateway } from './gateways/alert-recipients.gateway';
import { AlertTopic } from './domain/alert-topic';

@Injectable()
export class AlertRecipientsRepository implements AlertRecipientsGateway {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  // The role check keeps a stray topic on a student account from leaking
  // admin alerts to them.
  async findEmailsFor(topic: AlertTopic): Promise<string[]> {
    const rows = await this.repo
      .createQueryBuilder('user')
      .select('user.email', 'email')
      .where('user.role = :role', { role: UserRole.ADMIN })
      .andWhere(':topic = ANY(user.alertTopics)', { topic })
      .getRawMany<{ email: string }>();
    return rows.map((row) => row.email);
  }
}

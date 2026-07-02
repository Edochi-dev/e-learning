import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PushSubscription } from './entities/push-subscription.entity';
import {
  PushSubscriptionGateway,
  UpsertPushSubscriptionData,
} from './gateways/push-subscription.gateway';

@Injectable()
export class PushRepository implements PushSubscriptionGateway {
  constructor(
    @InjectRepository(PushSubscription)
    private readonly repo: Repository<PushSubscription>,
  ) {}

  async upsert(data: UpsertPushSubscriptionData): Promise<void> {
    const existing = await this.repo.findOne({
      where: { endpoint: data.endpoint },
    });
    if (existing) {
      existing.userId = data.userId;
      existing.p256dh = data.p256dh;
      existing.auth = data.auth;
      await this.repo.save(existing);
      return;
    }
    await this.repo.save(this.repo.create(data));
  }

  async findAll(): Promise<PushSubscription[]> {
    return this.repo.find();
  }

  async deleteByEndpoint(endpoint: string): Promise<void> {
    await this.repo.delete({ endpoint });
  }
}

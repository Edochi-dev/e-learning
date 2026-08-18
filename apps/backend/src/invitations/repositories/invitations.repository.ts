import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  InvitationGateway,
  NewInvitation,
} from '../gateways/invitation.gateway';
import { CourseInvitation } from '../entities/course-invitation.entity';

@Injectable()
export class InvitationsRepository implements InvitationGateway {
  constructor(
    @InjectRepository(CourseInvitation)
    private readonly invitationRepository: Repository<CourseInvitation>,
  ) {}

  async createMany(data: NewInvitation[]): Promise<CourseInvitation[]> {
    const invitations = this.invitationRepository.create(data);
    return this.invitationRepository.save(invitations);
  }

  async findByTokenHash(tokenHash: string): Promise<CourseInvitation | null> {
    return this.invitationRepository.findOne({
      where: { tokenHash },
      relations: ['course'],
    });
  }

  async findByCourse(courseId: string): Promise<CourseInvitation[]> {
    return this.invitationRepository.find({
      where: { courseId },
      relations: ['redeemedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<CourseInvitation | null> {
    return this.invitationRepository.findOne({ where: { id } });
  }

  async revoke(id: string, now: Date): Promise<void> {
    await this.invitationRepository.update(id, { revokedAt: now });
  }

  async markRedeemed(id: string, userId: string, now: Date): Promise<boolean> {
    // El WHERE lleva `redeemedAt: IsNull()`: la comprobación y la escritura son
    // la misma operación, así que PostgreSQL decide el ganador entre canjes
    // simultáneos. `affected` dice si esta llamada fue la que ganó.
    const result = await this.invitationRepository.update(
      { id, redeemedAt: IsNull() },
      { redeemedAt: now, redeemedByUserId: userId },
    );

    return result.affected === 1;
  }
}

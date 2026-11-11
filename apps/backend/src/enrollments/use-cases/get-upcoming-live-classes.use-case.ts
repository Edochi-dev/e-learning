import { Injectable } from '@nestjs/common';
import { UpcomingLiveClass } from '@maris-nails/shared';
import { UpcomingLiveClassesGateway } from '../gateways/upcoming-live-classes.gateway';

const MAX_CLASSES = 20;

/** The student's next live classes, for "Mis próximas clases". */
@Injectable()
export class GetUpcomingLiveClassesUseCase {
  constructor(private readonly gateway: UpcomingLiveClassesGateway) {}

  execute(userId: string): Promise<UpcomingLiveClass[]> {
    return this.gateway.findForStudent(userId, new Date(), MAX_CLASSES);
  }
}

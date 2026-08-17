import { Injectable } from '@nestjs/common';
import { WatchProgressGateway } from '../../progress/gateways/watch-progress.gateway';

/**
 * SaveWatchProgressUseCase — Guarda cuánto video ha visto el alumno.
 *
 * NO comprueba matrícula: de eso se encarga EnrollmentGuard en la ruta.
 */
@Injectable()
export class SaveWatchProgressUseCase {
  constructor(private readonly watchProgressGateway: WatchProgressGateway) {}

  async execute(
    userId: string,
    lessonId: string,
    percent: number,
  ): Promise<void> {
    await this.watchProgressGateway.saveWatchProgress(
      userId,
      lessonId,
      percent,
    );
  }
}

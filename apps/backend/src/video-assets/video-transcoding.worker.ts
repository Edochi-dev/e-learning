import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HlsConfig } from './hls.config';
import { VideoAssetGateway } from './gateways/video-asset.gateway';
import { ProcessNextVideoAssetUseCase } from './use-cases/process-next-video-asset.use-case';

/**
 * Drains the transcoding queue one asset at a time: the server is shared with
 * other projects and one encode already saturates the GPU encoder.
 */
@Injectable()
export class VideoTranscodingWorker implements OnApplicationBootstrap {
  private readonly logger = new Logger(VideoTranscodingWorker.name);
  private running = false;

  constructor(
    private readonly config: HlsConfig,
    private readonly assets: VideoAssetGateway,
    private readonly processNext: ProcessNextVideoAssetUseCase,
  ) {}

  // Safe only because this is the single worker: with more than one process,
  // this would steal assets another worker is still encoding.
  async onApplicationBootstrap(): Promise<void> {
    if (!this.config.enabled) return;
    const requeued = await this.assets.requeueInterrupted();
    if (requeued > 0) {
      this.logger.warn(
        `${requeued} video(s) interrumpido(s) vuelven a la cola`,
      );
    }
  }

  // An encode outlasts many ticks; the flag keeps ticks from stacking up.
  @Cron(CronExpression.EVERY_MINUTE)
  async drainQueue(): Promise<void> {
    if (!this.config.enabled || this.running) return;
    this.running = true;
    try {
      while (await this.processNext.execute()) {
        // keep going until the queue is empty
      }
    } finally {
      this.running = false;
    }
  }
}

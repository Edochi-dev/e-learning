import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isAbsolute, join } from 'path';

export const HlsVideoEncoder = {
  NVENC: 'nvenc',
  X264: 'x264',
} as const;

export type HlsVideoEncoder =
  (typeof HlsVideoEncoder)[keyof typeof HlsVideoEncoder];

/** Resolved relative to apps/backend, like public/. */
const BACKEND_ROOT = join(__dirname, '..', '..');

@Injectable()
export class HlsConfig {
  readonly enabled: boolean;
  readonly sourceDir: string;
  readonly mediaDir: string;
  readonly mediaBaseUrl: string;
  readonly mediaSecret: string;
  readonly encoder: HlsVideoEncoder;
  readonly ffmpegPath: string;
  readonly ffprobePath: string;
  readonly tokenTtlSeconds: number;

  constructor(config: ConfigService) {
    this.enabled = config.get<boolean>('HLS_ENABLED', false);
    // Must stay outside public/: ServeStaticModule would expose the sources.
    this.sourceDir = resolveDir(
      config.get<string>('HLS_SOURCE_DIR', 'storage/video-sources'),
    );
    this.mediaDir = resolveDir(
      config.get<string>('HLS_MEDIA_DIR', 'storage/hls'),
    );
    this.mediaBaseUrl = config
      .get<string>('HLS_MEDIA_BASE_URL', '/hls-media')
      .replace(/\/+$/, '');
    this.mediaSecret = config.get<string>('HLS_MEDIA_SECRET', '');
    this.encoder = config.get<HlsVideoEncoder>(
      'HLS_VIDEO_ENCODER',
      HlsVideoEncoder.NVENC,
    );
    this.ffmpegPath = config.get<string>('FFMPEG_PATH', 'ffmpeg');
    this.ffprobePath = config.get<string>('FFPROBE_PATH', 'ffprobe');
    this.tokenTtlSeconds = config.get<number>('HLS_TOKEN_TTL_MINUTES', 30) * 60;
  }
}

function resolveDir(dir: string): string {
  return isAbsolute(dir) ? dir : join(BACKEND_ROOT, dir);
}

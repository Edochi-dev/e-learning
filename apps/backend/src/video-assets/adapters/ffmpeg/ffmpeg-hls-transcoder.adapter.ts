import { Injectable, Logger } from '@nestjs/common';
import { mkdir, rename, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { randomBytes } from 'crypto';
import {
  TranscodeRequest,
  VideoTranscoder,
} from '../../gateways/video-transcoder.gateway';
import { TranscodeResult } from '../../gateways/video-asset.gateway';
import { selectRenditions } from '../../domain/rendition-ladder';
import { buildMasterPlaylist } from '../../domain/master-playlist';
import { HlsConfig } from '../../hls.config';
import { parseFfprobeOutput } from './source-probe';
import { VideoPipelineProfile } from './video-pipeline-profile';
import { buildAudioEncodeArgs, buildFfmpegHlsArgs } from './ffmpeg-hls-args';
import { runProcess } from '../../../common/process/run-process';

/** Placeholder written into the playlists; replaced per request when served. */
export const KEY_URI_PLACEHOLDER = 'key';

@Injectable()
export class FfmpegHlsTranscoder implements VideoTranscoder {
  private readonly logger = new Logger(FfmpegHlsTranscoder.name);

  constructor(
    private readonly config: HlsConfig,
    private readonly pipeline: VideoPipelineProfile,
  ) {}

  async transcode(request: TranscodeRequest): Promise<TranscodeResult> {
    const inputPath = join(this.config.sourceDir, request.sourcePath);
    const finalDir = join(this.config.mediaDir, request.assetId);
    // Written beside the final directory and renamed into place, so a reader
    // never sees a half-written asset and a crash leaves only the .tmp behind.
    const workDir = `${finalDir}.tmp`;
    // The key and the intermediate audio live only for the duration of the
    // run, and never inside the directory the web server exposes.
    const scratchDir = `${finalDir}.scratch.tmp`;

    const source = parseFfprobeOutput(
      await runProcess(this.config.ffprobePath, [
        '-v',
        'error',
        '-print_format',
        'json',
        '-show_streams',
        '-show_format',
        inputPath,
      ]),
    );
    const renditions = selectRenditions(source);

    await rm(workDir, { recursive: true, force: true });
    for (const r of renditions) {
      await mkdir(join(workDir, r.name), { recursive: true });
    }
    await mkdir(scratchDir, { recursive: true, mode: 0o700 });

    try {
      const keyPath = join(scratchDir, 'enc.key');
      const keyInfoPath = join(scratchDir, 'enc.keyinfo');
      await writeFile(keyPath, request.key, { mode: 0o600 });
      await writeFile(
        keyInfoPath,
        `${KEY_URI_PLACEHOLDER}\n${keyPath}\n${randomBytes(16).toString('hex')}\n`,
        { mode: 0o600 },
      );

      const started = Date.now();
      const encodedAudioPath = source.hasAudio
        ? join(scratchDir, 'audio.m4a')
        : null;
      if (encodedAudioPath) {
        await runProcess(
          this.config.ffmpegPath,
          buildAudioEncodeArgs(inputPath, encodedAudioPath),
        );
      }

      await runProcess(
        this.config.ffmpegPath,
        buildFfmpegHlsArgs({
          inputPath,
          encodedAudioPath,
          outputDir: workDir,
          keyInfoPath,
          source,
          renditions,
          pipeline: this.pipeline,
        }),
      );

      await writeFile(
        join(workDir, 'master.m3u8'),
        buildMasterPlaylist({
          renditions,
          source,
          hasAudio: source.hasAudio,
        }),
      );

      await rm(finalDir, { recursive: true, force: true });
      await rename(workDir, finalDir);
      this.logger.log(
        `Asset ${request.assetId}: ${renditions.length} calidades en ${Math.round((Date.now() - started) / 1000)} s`,
      );

      return {
        durationSeconds: source.durationSeconds,
        renditions: renditions.map((r) => r.name),
      };
    } catch (error) {
      await rm(workDir, { recursive: true, force: true });
      throw error;
    } finally {
      await rm(scratchDir, { recursive: true, force: true });
    }
  }
}

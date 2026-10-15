import { Injectable } from '@nestjs/common';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  AudioNormalizer,
  InvalidAudioError,
  NormalizedAudio,
} from '../gateways/audio-normalizer.gateway';
import { CorrectionAudioConfig } from '../correction-audio.config';
import { runProcess } from '../../common/process/run-process';

/**
 * Mono AAC at 64 kbps: plenty for a voice, about 0.5 MB per minute, and
 * playable on every phone. +faststart lets playback begin before the whole
 * file has arrived.
 */
@Injectable()
export class FfmpegAudioNormalizer extends AudioNormalizer {
  constructor(private readonly config: CorrectionAudioConfig) {
    super();
  }

  async normalize(input: Buffer): Promise<NormalizedAudio> {
    const workDir = await mkdtemp(join(tmpdir(), 'review-audio-'));
    const inputPath = join(workDir, 'input');
    const outputPath = join(workDir, 'output.m4a');
    try {
      await writeFile(inputPath, input);
      if (!(await this.hasAudioStream(inputPath))) {
        throw new InvalidAudioError('El archivo no contiene audio.');
      }
      await runProcess(this.config.ffmpegPath, [
        '-nostdin',
        '-v',
        'error',
        '-y',
        '-i',
        inputPath,
        '-map',
        '0:a:0',
        '-vn',
        '-ac',
        '1',
        '-ar',
        '48000',
        '-c:a',
        'aac',
        '-b:a',
        '64k',
        '-movflags',
        '+faststart',
        outputPath,
      ]);
      return {
        data: await readFile(outputPath),
        durationSeconds: await this.durationOf(outputPath),
      };
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  }

  private async hasAudioStream(path: string): Promise<boolean> {
    try {
      const out = await runProcess(this.config.ffprobePath, [
        '-v',
        'error',
        '-select_streams',
        'a',
        '-show_entries',
        'stream=codec_type',
        '-of',
        'csv=p=0',
        path,
      ]);
      return out.trim().length > 0;
    } catch {
      return false;
    }
  }

  // Read from the re-encoded file: MediaRecorder's WebM carries no duration.
  private async durationOf(path: string): Promise<number> {
    const out = await runProcess(this.config.ffprobePath, [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'csv=p=0',
      path,
    ]);
    return Number.parseFloat(out.trim());
  }
}

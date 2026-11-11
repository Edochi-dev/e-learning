import { Injectable } from '@nestjs/common';
import { createReadStream } from 'fs';
import { mkdir, rm, stat, writeFile } from 'fs/promises';
import { basename, join } from 'path';
import { Readable } from 'stream';
import { CorrectionAudioStore } from '../gateways/correction-audio-store.gateway';
import { CorrectionAudioConfig } from '../correction-audio.config';

@Injectable()
export class LocalCorrectionAudioStore extends CorrectionAudioStore {
  constructor(private readonly config: CorrectionAudioConfig) {
    super();
  }

  async save(reviewId: string, data: Buffer): Promise<string> {
    await mkdir(this.config.audioDir, { recursive: true, mode: 0o700 });
    const audioFile = `${reviewId}.m4a`;
    await writeFile(this.localPath(audioFile), data, { mode: 0o600 });
    return audioFile;
  }

  async open(audioFile: string): Promise<{ stream: Readable; size: number }> {
    const path = this.localPath(audioFile);
    const { size } = await stat(path);
    return { stream: createReadStream(path), size };
  }

  // basename() keeps a stored name from ever pointing outside the directory.
  localPath(audioFile: string): string {
    return join(this.config.audioDir, basename(audioFile));
  }

  async delete(audioFile: string): Promise<void> {
    await rm(this.localPath(audioFile), { force: true });
  }
}

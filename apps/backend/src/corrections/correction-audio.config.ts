import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isAbsolute, join } from 'path';

/** Resolved relative to apps/backend, like public/. */
const BACKEND_ROOT = join(__dirname, '..', '..');

@Injectable()
export class CorrectionAudioConfig {
  /** Must stay outside public/: the teacher's voice is private to the student. */
  readonly audioDir: string;
  readonly ffmpegPath: string;
  readonly ffprobePath: string;
  readonly transcriptionEnabled: boolean;
  readonly whisperPython: string;
  readonly whisperScript: string;
  readonly whisperModel: string;
  readonly whisperDevice: string;

  constructor(config: ConfigService) {
    this.audioDir = resolveDir(
      config.get<string>('CORRECTION_AUDIO_DIR', 'storage/correction-audio'),
    );
    this.ffmpegPath = config.get<string>('FFMPEG_PATH', 'ffmpeg');
    this.ffprobePath = config.get<string>('FFPROBE_PATH', 'ffprobe');
    this.transcriptionEnabled = config.get<boolean>(
      'TRANSCRIPTION_ENABLED',
      false,
    );
    this.whisperPython = config.get<string>('WHISPER_PYTHON', 'python3');
    this.whisperScript = join(BACKEND_ROOT, 'scripts', 'transcribe.py');
    this.whisperModel = config.get<string>('WHISPER_MODEL', 'large-v3-turbo');
    this.whisperDevice = config.get<string>('WHISPER_DEVICE', 'cuda');
  }
}

function resolveDir(dir: string): string {
  return isAbsolute(dir) ? dir : join(BACKEND_ROOT, dir);
}

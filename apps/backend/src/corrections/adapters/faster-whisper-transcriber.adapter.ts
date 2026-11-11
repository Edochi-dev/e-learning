import { SpeechTranscriber } from '../gateways/speech-transcriber.gateway';
import { CorrectionAudioConfig } from '../correction-audio.config';
import { runProcess } from '../../common/process/run-process';

/**
 * Runs scripts/transcribe.py (faster-whisper on the server's GPU) once per
 * audio. The audio never leaves the server.
 */
export class FasterWhisperTranscriber extends SpeechTranscriber {
  readonly enabled = true;

  constructor(private readonly config: CorrectionAudioConfig) {
    super();
  }

  async transcribe(audioPath: string): Promise<string> {
    const stdout = await runProcess(this.config.whisperPython, [
      '-I',
      this.config.whisperScript,
      audioPath,
      '--model',
      this.config.whisperModel,
      '--device',
      this.config.whisperDevice,
      '--ffmpeg',
      this.config.ffmpegPath,
    ]);
    const { text } = JSON.parse(stdout) as { text: string };
    return text;
  }
}

/** Used when TRANSCRIPTION_ENABLED is off: reviews are marked unavailable. */
export class DisabledSpeechTranscriber extends SpeechTranscriber {
  readonly enabled = false;

  transcribe(): Promise<string> {
    return Promise.reject(new Error('La transcripción está desactivada.'));
  }
}

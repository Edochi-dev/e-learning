/** Turns a recorded review into text. */
export abstract class SpeechTranscriber {
  /** False when transcription is switched off in this environment. */
  abstract readonly enabled: boolean;

  abstract transcribe(audioPath: string): Promise<string>;
}

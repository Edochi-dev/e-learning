export const TranscriptStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  DONE: 'done',
  FAILED: 'failed',
  /** Transcription is switched off in this environment. */
  UNAVAILABLE: 'unavailable',
} as const;

export type TranscriptStatus =
  (typeof TranscriptStatus)[keyof typeof TranscriptStatus];

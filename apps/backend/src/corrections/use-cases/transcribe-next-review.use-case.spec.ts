import { TranscribeNextReviewUseCase } from './transcribe-next-review.use-case';
import { ReviewTranscriptionQueue } from '../gateways/review-transcription-queue.gateway';
import { SpeechTranscriber } from '../gateways/speech-transcriber.gateway';
import { CorrectionAudioStore } from '../gateways/correction-audio-store.gateway';

describe('TranscribeNextReviewUseCase', () => {
  let claimNext: jest.Mock;
  let markTranscribed: jest.Mock;
  let markFailed: jest.Mock;
  let transcribe: jest.Mock;
  let useCase: TranscribeNextReviewUseCase;

  beforeEach(() => {
    claimNext = jest
      .fn()
      .mockResolvedValue({ reviewId: 'r1', audioFile: 'r1.m4a' });
    markTranscribed = jest.fn().mockResolvedValue(undefined);
    markFailed = jest.fn().mockResolvedValue(undefined);
    transcribe = jest.fn().mockResolvedValue('Hola Ana, muy bien.');
    useCase = new TranscribeNextReviewUseCase(
      {
        claimNext,
        markTranscribed,
        markFailed,
      } as unknown as ReviewTranscriptionQueue,
      { enabled: true, transcribe } as unknown as SpeechTranscriber,
      {
        localPath: (file: string) => `/audio/${file}`,
      } as unknown as CorrectionAudioStore,
    );
  });

  it('devuelve false cuando no hay nada en cola', async () => {
    claimNext.mockResolvedValue(null);
    await expect(useCase.execute()).resolves.toBe(false);
    expect(transcribe).not.toHaveBeenCalled();
  });

  it('transcribe el archivo del disco y guarda el texto', async () => {
    await expect(useCase.execute()).resolves.toBe(true);
    expect(transcribe).toHaveBeenCalledWith('/audio/r1.m4a');
    expect(markTranscribed).toHaveBeenCalledWith('r1', 'Hola Ana, muy bien.');
  });

  it('marca la revisión como fallida si Whisper falla, y sigue', async () => {
    transcribe.mockRejectedValue(new Error('CUDA out of memory'));
    await expect(useCase.execute()).resolves.toBe(true);
    expect(markFailed).toHaveBeenCalledWith('r1');
    expect(markTranscribed).not.toHaveBeenCalled();
  });
});

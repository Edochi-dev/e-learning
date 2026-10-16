import { ReviewTranscriptionWorker } from './review-transcription.worker';
import { SpeechTranscriber } from './gateways/speech-transcriber.gateway';
import { ReviewTranscriptionQueue } from './gateways/review-transcription-queue.gateway';
import { TranscribeNextReviewUseCase } from './use-cases/transcribe-next-review.use-case';

describe('ReviewTranscriptionWorker', () => {
  let requeueInterrupted: jest.Mock;
  let queueUntranscribed: jest.Mock;
  let execute: jest.Mock;

  function worker(enabled: boolean): ReviewTranscriptionWorker {
    return new ReviewTranscriptionWorker(
      { enabled } as SpeechTranscriber,
      {
        requeueInterrupted,
        queueUntranscribed,
      } as unknown as ReviewTranscriptionQueue,
      { execute } as unknown as TranscribeNextReviewUseCase,
    );
  }

  beforeEach(() => {
    requeueInterrupted = jest.fn().mockResolvedValue(0);
    queueUntranscribed = jest.fn().mockResolvedValue(0);
    execute = jest.fn().mockResolvedValue(false);
  });

  it('al arrancar recupera las interrumpidas y encola las grabadas sin transcripción', async () => {
    await worker(true).onApplicationBootstrap();
    expect(requeueInterrupted).toHaveBeenCalled();
    expect(queueUntranscribed).toHaveBeenCalled();
  });

  it('con la transcripción apagada no toca la cola', async () => {
    const w = worker(false);
    await w.onApplicationBootstrap();
    await w.drainQueue();
    expect(queueUntranscribed).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });

  it('vacía la cola en una pasada', async () => {
    execute
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValue(false);
    await worker(true).drainQueue();
    expect(execute).toHaveBeenCalledTimes(3);
  });

  it('no arranca una pasada nueva mientras otra sigue corriendo', async () => {
    let finish!: (more: boolean) => void;
    execute.mockReturnValueOnce(
      new Promise<boolean>((resolve) => (finish = resolve)),
    );
    const w = worker(true);
    const first = w.drainQueue();
    await w.drainQueue();
    expect(execute).toHaveBeenCalledTimes(1);
    finish(false);
    await first;
  });
});

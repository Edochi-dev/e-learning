import { PurgeExpiredReviewAudioUseCase } from './purge-expired-review-audio.use-case';
import { ExpiredReviewAudioGateway } from '../gateways/expired-review-audio.gateway';
import { CorrectionAudioStore } from '../gateways/correction-audio-store.gateway';

describe('PurgeExpiredReviewAudioUseCase', () => {
  it('borra el archivo y luego la referencia de cada audio vencido', async () => {
    const calls: string[] = [];
    const findExpired = jest
      .fn()
      .mockResolvedValueOnce([
        { reviewId: 'r1', audioFile: 'r1.m4a' },
        { reviewId: 'r2', audioFile: 'r2.m4a' },
      ])
      .mockResolvedValue([]);
    const useCase = new PurgeExpiredReviewAudioUseCase(
      {
        findExpired,
        clearAudio: (id: string) => {
          calls.push(`clear:${id}`);
          return Promise.resolve();
        },
      } as unknown as ExpiredReviewAudioGateway,
      {
        delete: (file: string) => {
          calls.push(`delete:${file}`);
          return Promise.resolve();
        },
      } as unknown as CorrectionAudioStore,
    );

    const now = new Date('2026-11-01T00:00:00Z');
    await expect(useCase.execute(now)).resolves.toBe(2);
    expect(findExpired).toHaveBeenCalledWith(now, 100);
    expect(calls).toEqual([
      'delete:r1.m4a',
      'clear:r1',
      'delete:r2.m4a',
      'clear:r2',
    ]);
  });
});

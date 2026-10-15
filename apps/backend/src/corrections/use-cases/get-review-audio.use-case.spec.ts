import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Readable } from 'stream';
import { GetReviewAudioUseCase } from './get-review-audio.use-case';
import { CorrectionReviewGateway } from '../gateways/correction-review.gateway';
import { CorrectionAudioStore } from '../gateways/correction-audio-store.gateway';
import { CorrectionReview } from '../entities/correction-review.entity';

describe('GetReviewAudioUseCase', () => {
  const review = {
    id: 'review-1',
    audioFile: 'review-1.m4a',
    submission: { studentId: 'ana' },
  } as CorrectionReview;
  let findWithSubmission: jest.Mock;
  let open: jest.Mock;
  let useCase: GetReviewAudioUseCase;

  beforeEach(() => {
    findWithSubmission = jest.fn().mockResolvedValue(review);
    open = jest
      .fn()
      .mockResolvedValue({ stream: Readable.from(['x']), size: 1 });
    useCase = new GetReviewAudioUseCase(
      { findWithSubmission } as unknown as CorrectionReviewGateway,
      { open } as unknown as CorrectionAudioStore,
    );
  });

  it('entrega el audio a la alumna dueña', async () => {
    const audio = await useCase.execute('review-1', {
      id: 'ana',
      role: 'student',
    });
    expect(open).toHaveBeenCalledWith('review-1.m4a');
    expect(audio.contentType).toBe('audio/mp4');
  });

  it('entrega el audio a un admin', async () => {
    await useCase.execute('review-1', { id: 'profe', role: 'admin' });
    expect(open).toHaveBeenCalled();
  });

  it('responde 404 a otra alumna, sin revelar que existe', async () => {
    await expect(
      useCase.execute('review-1', { id: 'luisa', role: 'student' }),
    ).rejects.toThrow(NotFoundException);
    expect(open).not.toHaveBeenCalled();
  });

  it('responde 404 si la revisión no existe', async () => {
    findWithSubmission.mockResolvedValue(null);
    await expect(
      useCase.execute('nope', { id: 'ana', role: 'student' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('avisa cuando el audio ya se borró por vencimiento', async () => {
    findWithSubmission.mockResolvedValue({ ...review, audioFile: null });
    await expect(
      useCase.execute('review-1', { id: 'ana', role: 'student' }),
    ).rejects.toThrow(ForbiddenException);
  });
});

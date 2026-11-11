import { BadRequestException } from '@nestjs/common';
import { ReviewAudioRecorder } from './review-audio-recorder.service';
import {
  AudioNormalizer,
  InvalidAudioError,
} from '../gateways/audio-normalizer.gateway';
import { CorrectionAudioStore } from '../gateways/correction-audio-store.gateway';

describe('ReviewAudioRecorder', () => {
  let normalize: jest.Mock;
  let save: jest.Mock;
  let recorder: ReviewAudioRecorder;

  beforeEach(() => {
    normalize = jest
      .fn()
      .mockResolvedValue({ data: Buffer.from('aac'), durationSeconds: 41.6 });
    save = jest.fn().mockResolvedValue('r1.m4a');
    recorder = new ReviewAudioRecorder(
      { normalize } as unknown as AudioNormalizer,
      { save } as unknown as CorrectionAudioStore,
    );
  });

  it('guarda el audio normalizado y redondea la duración', async () => {
    await expect(recorder.store('r1', Buffer.from('webm'))).resolves.toEqual({
      audioFile: 'r1.m4a',
      durationSeconds: 42,
    });
    expect(save).toHaveBeenCalledWith('r1', Buffer.from('aac'));
  });

  it('rechaza audios de más de dos minutos sin guardarlos', async () => {
    normalize.mockResolvedValue({
      data: Buffer.from('aac'),
      durationSeconds: 150,
    });
    await expect(recorder.store('r1', Buffer.from('webm'))).rejects.toThrow(
      BadRequestException,
    );
    expect(save).not.toHaveBeenCalled();
  });

  it('traduce un archivo sin audio a un error para la profesora', async () => {
    normalize.mockRejectedValue(new InvalidAudioError('sin audio'));
    await expect(recorder.store('r1', Buffer.from('x'))).rejects.toThrow(
      BadRequestException,
    );
  });
});

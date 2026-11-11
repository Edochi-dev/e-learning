import { Logger } from '@nestjs/common';
import { ProcessNextVideoAssetUseCase } from './process-next-video-asset.use-case';
import { VideoAssetGateway } from '../gateways/video-asset.gateway';
import { HlsKeyStore } from '../gateways/hls-key-store.gateway';
import { VideoTranscoder } from '../gateways/video-transcoder.gateway';
import { VideoAsset } from '../entities/video-asset.entity';

describe('ProcessNextVideoAssetUseCase', () => {
  const key = Buffer.alloc(16, 7);
  const asset = { id: 'a1', sourcePath: 'clase.mov' } as VideoAsset;
  let assets: jest.Mocked<VideoAssetGateway>;
  let keys: jest.Mocked<HlsKeyStore>;
  let transcoder: jest.Mocked<VideoTranscoder>;
  let useCase: ProcessNextVideoAssetUseCase;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    assets = {
      claimNextPending: jest.fn().mockResolvedValue(asset),
      markReady: jest.fn(),
      markFailed: jest.fn(),
    } as unknown as jest.Mocked<VideoAssetGateway>;
    keys = {
      issue: jest.fn().mockResolvedValue(key),
    } as unknown as jest.Mocked<HlsKeyStore>;
    transcoder = { transcode: jest.fn() } as jest.Mocked<VideoTranscoder>;
    useCase = new ProcessNextVideoAssetUseCase(assets, keys, transcoder);
  });

  it('does nothing and reports an empty queue', async () => {
    assets.claimNextPending.mockResolvedValue(null);

    await expect(useCase.execute()).resolves.toBe(false);
    expect(keys.issue).not.toHaveBeenCalled();
  });

  it('encrypts with a freshly issued key and marks the asset ready', async () => {
    const result = { durationSeconds: 300, renditions: ['720p', '480p'] };
    transcoder.transcode.mockResolvedValue(result);

    await expect(useCase.execute()).resolves.toBe(true);
    expect(transcoder.transcode).toHaveBeenCalledWith({
      assetId: 'a1',
      sourcePath: 'clase.mov',
      key,
    });
    expect(assets.markReady).toHaveBeenCalledWith('a1', result);
  });

  it('marks the asset failed with the reason, without throwing to the worker', async () => {
    transcoder.transcode.mockRejectedValue(
      new Error('ffmpeg terminó con código 1'),
    );

    await expect(useCase.execute()).resolves.toBe(true);
    expect(assets.markFailed).toHaveBeenCalledWith(
      'a1',
      'ffmpeg terminó con código 1',
    );
    expect(assets.markReady).not.toHaveBeenCalled();
  });

  it('truncates very long failure output', async () => {
    transcoder.transcode.mockRejectedValue(new Error('x'.repeat(5000)));

    await useCase.execute();
    expect(assets.markFailed.mock.calls[0][1]).toHaveLength(2000);
  });
});

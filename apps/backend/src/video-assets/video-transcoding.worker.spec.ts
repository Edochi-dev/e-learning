import { VideoTranscodingWorker } from './video-transcoding.worker';
import { HlsConfig } from './hls.config';
import { VideoAssetGateway } from './gateways/video-asset.gateway';
import { ProcessNextVideoAssetUseCase } from './use-cases/process-next-video-asset.use-case';

describe('VideoTranscodingWorker', () => {
  let assets: jest.Mocked<VideoAssetGateway>;
  let processNext: jest.Mocked<ProcessNextVideoAssetUseCase>;

  const worker = (enabled: boolean) =>
    new VideoTranscodingWorker({ enabled } as HlsConfig, assets, processNext);

  beforeEach(() => {
    assets = {
      requeueInterrupted: jest.fn().mockResolvedValue(0),
    } as unknown as jest.Mocked<VideoAssetGateway>;
    processNext = {
      execute: jest.fn().mockResolvedValue(false),
    } as unknown as jest.Mocked<ProcessNextVideoAssetUseCase>;
  });

  it('does nothing at all while HLS is disabled', async () => {
    const w = worker(false);
    await w.onApplicationBootstrap();
    await w.drainQueue();

    expect(assets.requeueInterrupted).not.toHaveBeenCalled();
    expect(processNext.execute).not.toHaveBeenCalled();
  });

  it('requeues interrupted assets on startup', async () => {
    await worker(true).onApplicationBootstrap();
    expect(assets.requeueInterrupted).toHaveBeenCalled();
  });

  it('keeps processing until the queue is empty', async () => {
    processNext.execute
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    await worker(true).drainQueue();
    expect(processNext.execute).toHaveBeenCalledTimes(3);
  });

  it('skips a tick while a previous one is still encoding', async () => {
    let finish!: (found: boolean) => void;
    processNext.execute.mockReturnValueOnce(
      new Promise<boolean>((resolve) => (finish = resolve)),
    );
    const w = worker(true);

    const first = w.drainQueue();
    await w.drainQueue();
    expect(processNext.execute).toHaveBeenCalledTimes(1);

    finish(false);
    await first;
  });

  it('accepts new ticks again after a run that threw', async () => {
    processNext.execute.mockRejectedValueOnce(new Error('db down'));
    const w = worker(true);

    await expect(w.drainQueue()).rejects.toThrow('db down');
    await w.drainQueue();
    expect(processNext.execute).toHaveBeenCalledTimes(2);
  });
});

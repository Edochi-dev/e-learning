import { NotFoundException } from '@nestjs/common';
import { IssueHlsPlaybackUseCase } from './issue-hls-playback.use-case';
import { VideoAssetGateway } from '../gateways/video-asset.gateway';
import { HlsPlaybackTokenService } from '../services/hls-playback-token.service';
import { HlsConfig } from '../hls.config';
import { VideoAsset } from '../entities/video-asset.entity';
import { VideoAssetStatus } from '../domain/video-asset-status';

describe('IssueHlsPlaybackUseCase', () => {
  const NOW = new Date('2026-10-20T12:00:00Z').getTime();
  let assets: jest.Mocked<VideoAssetGateway>;
  let tokens: jest.Mocked<HlsPlaybackTokenService>;
  let useCase: IssueHlsPlaybackUseCase;

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    assets = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<VideoAssetGateway>;
    tokens = {
      issue: jest.fn().mockReturnValue('u.1.sig'),
    } as unknown as jest.Mocked<HlsPlaybackTokenService>;
    useCase = new IssueHlsPlaybackUseCase(assets, tokens, {
      tokenTtlSeconds: 1800,
    } as HlsConfig);
  });

  afterEach(() => jest.restoreAllMocks());

  it.each([
    ['missing', null],
    ['still processing', { id: 'a1', status: VideoAssetStatus.PROCESSING }],
    ['failed', { id: 'a1', status: VideoAssetStatus.FAILED }],
  ])('refuses an asset that is %s', async (_, asset) => {
    assets.findById.mockResolvedValue(asset as VideoAsset | null);
    await expect(useCase.execute('a1', 'u')).rejects.toThrow(NotFoundException);
  });

  it('issues a master URL valid for the TTL plus the whole video', async () => {
    assets.findById.mockResolvedValue({
      id: 'a1',
      status: VideoAssetStatus.READY,
      durationSeconds: 5400,
    } as VideoAsset);

    const playback = await useCase.execute('a1', 'user-1');

    const expected = NOW + (1800 + 5400) * 1000;
    expect(tokens.issue).toHaveBeenCalledWith(
      'a1',
      'user-1',
      new Date(expected),
    );
    expect(playback).toEqual({
      url: '/hls/a1/master.m3u8?token=u.1.sig',
      expires: expected,
    });
  });
});

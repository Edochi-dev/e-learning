import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GetHlsMasterPlaylistUseCase } from './get-hls-master-playlist.use-case';
import { GetHlsVariantPlaylistUseCase } from './get-hls-variant-playlist.use-case';
import { GetHlsKeyUseCase } from './get-hls-key.use-case';
import { HlsPlaylistStore } from '../gateways/hls-playlist-store.gateway';
import { HlsMediaUrlSigner } from '../gateways/hls-media-url-signer.gateway';
import { HlsKeyStore } from '../gateways/hls-key-store.gateway';
import { HlsPlaybackTokenService } from '../services/hls-playback-token.service';

const EXPIRES = new Date('2026-10-20T14:00:00Z');

describe('HLS playback use cases', () => {
  let tokens: jest.Mocked<HlsPlaybackTokenService>;
  let playlists: jest.Mocked<HlsPlaylistStore>;

  beforeEach(() => {
    tokens = {
      verify: jest.fn().mockReturnValue({ userId: 'u', expiresAt: EXPIRES }),
    } as unknown as jest.Mocked<HlsPlaybackTokenService>;
    playlists = {
      readMaster: jest.fn(),
      readVariant: jest.fn(),
    } as jest.Mocked<HlsPlaylistStore>;
  });

  describe('master playlist', () => {
    const useCase = () => new GetHlsMasterPlaylistUseCase(playlists, tokens);

    it('rejects an invalid token before touching storage', async () => {
      tokens.verify.mockReturnValue(null);
      await expect(useCase().execute('a1', 'bad')).rejects.toThrow(
        ForbiddenException,
      );
      expect(playlists.readMaster).not.toHaveBeenCalled();
    });

    it('returns 404 when the asset has no output', async () => {
      playlists.readMaster.mockResolvedValue(null);
      await expect(useCase().execute('a1', 't')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('propagates the token to the variant URIs', async () => {
      playlists.readMaster.mockResolvedValue('#EXTM3U\n720p/index.m3u8\n');
      await expect(useCase().execute('a1', 't')).resolves.toBe(
        '#EXTM3U\n720p/index.m3u8?token=t\n',
      );
    });
  });

  describe('variant playlist', () => {
    const signer = {
      signSegmentUrl: jest.fn(
        (l: { segment: string }) => `/hls-media/${l.segment}?signed`,
      ),
    } as unknown as jest.Mocked<HlsMediaUrlSigner>;
    const useCase = () =>
      new GetHlsVariantPlaylistUseCase(playlists, signer, tokens);

    it('rejects an invalid token', async () => {
      tokens.verify.mockReturnValue(null);
      await expect(useCase().execute('a1', '720p', 'bad')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('signs segments until the token itself expires and routes the key through the API', async () => {
      playlists.readVariant.mockResolvedValue(
        '#EXT-X-KEY:METHOD=AES-128,URI="key"\n#EXTINF:6,\nseg_0000.ts\n',
      );

      const result = await useCase().execute('a1', '720p', 't');

      expect(signer.signSegmentUrl).toHaveBeenCalledWith(
        { assetId: 'a1', rendition: '720p', segment: 'seg_0000.ts' },
        EXPIRES,
      );
      expect(result).toBe(
        '#EXT-X-KEY:METHOD=AES-128,URI="../key?token=t"\n#EXTINF:6,\n/hls-media/seg_0000.ts?signed\n',
      );
    });
  });

  describe('key', () => {
    const keys = { find: jest.fn() } as unknown as jest.Mocked<HlsKeyStore>;
    const useCase = () => new GetHlsKeyUseCase(keys, tokens);

    it('never hands out a key without a valid token', async () => {
      tokens.verify.mockReturnValue(null);
      await expect(useCase().execute('a1', 'bad')).rejects.toThrow(
        ForbiddenException,
      );
      expect(keys.find).not.toHaveBeenCalled();
    });

    it('returns the stored key', async () => {
      const key = Buffer.alloc(16, 1);
      keys.find.mockResolvedValue(key);
      await expect(useCase().execute('a1', 't')).resolves.toBe(key);
    });

    it('returns 404 for an asset without a key', async () => {
      keys.find.mockResolvedValue(null);
      await expect(useCase().execute('a1', 't')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

import { buildMasterPlaylist, scaledWidth } from './master-playlist';
import { RENDITION_LADDER } from './rendition-ladder';

const [r1080, r720] = RENDITION_LADDER;

describe('master playlist', () => {
  it('keeps the aspect ratio and rounds the width to an even number', () => {
    expect(scaledWidth(r720, 1920, 1080)).toBe(1280);
    expect(scaledWidth(r720, 1080, 1920)).toBe(406); // portrait phone video
  });

  it('lists each rendition with its peak bandwidth and relative playlist', () => {
    const playlist = buildMasterPlaylist({
      renditions: [r1080, r720],
      sourceWidth: 1920,
      sourceHeight: 1080,
      hasAudio: true,
    });

    expect(playlist.split('\n')).toEqual([
      '#EXTM3U',
      '#EXT-X-VERSION:3',
      '#EXT-X-STREAM-INF:BANDWIDTH=5478000,RESOLUTION=1920x1080,CODECS="avc1.640028,mp4a.40.2"',
      '1080p/index.m3u8',
      '#EXT-X-STREAM-INF:BANDWIDTH=3124000,RESOLUTION=1280x720,CODECS="avc1.640028,mp4a.40.2"',
      '720p/index.m3u8',
      '',
    ]);
  });

  it('declares neither audio codec nor audio bandwidth for a silent video', () => {
    const playlist = buildMasterPlaylist({
      renditions: [r720],
      sourceWidth: 1280,
      sourceHeight: 720,
      hasAudio: false,
    });
    expect(playlist).toContain('BANDWIDTH=2996000');
    expect(playlist).toContain('CODECS="avc1.640028"');
  });
});

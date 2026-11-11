import {
  rewriteMasterPlaylist,
  rewriteVariantPlaylist,
} from './hls-playlist-rewriter';

describe('hls playlist rewriter', () => {
  it('appends the token to every variant URI of the master, leaving tags alone', () => {
    const master = [
      '#EXTM3U',
      '#EXT-X-STREAM-INF:BANDWIDTH=3124000,RESOLUTION=1280x720',
      '720p/index.m3u8',
      '',
    ].join('\n');

    expect(rewriteMasterPlaylist(master, 'u.1.s+/')).toBe(
      [
        '#EXTM3U',
        '#EXT-X-STREAM-INF:BANDWIDTH=3124000,RESOLUTION=1280x720',
        '720p/index.m3u8?token=u.1.s%2B%2F',
        '',
      ].join('\n'),
    );
  });

  it('points the key at the API and every segment at its signed URL', () => {
    const variant = [
      '#EXTM3U',
      '#EXT-X-PLAYLIST-TYPE:VOD',
      '#EXT-X-KEY:METHOD=AES-128,URI="key",IV=0x00112233445566778899aabbccddeeff',
      '#EXTINF:6.000000,',
      'seg_0000.ts',
      '#EXTINF:2.500000,',
      'seg_0001.ts',
      '#EXT-X-ENDLIST',
    ].join('\n');

    const result = rewriteVariantPlaylist(variant, {
      keyUri: '../key?token=t',
      segmentUrl: (s) => `/hls-media/a/720p/${s}?md5=m`,
    });

    expect(result).toContain(
      '#EXT-X-KEY:METHOD=AES-128,URI="../key?token=t",IV=0x00112233445566778899aabbccddeeff',
    );
    expect(result).toContain('\n/hls-media/a/720p/seg_0000.ts?md5=m\n');
    expect(result).toContain('\n/hls-media/a/720p/seg_0001.ts?md5=m\n');
    expect(result.endsWith('#EXT-X-ENDLIST')).toBe(true);
  });
});

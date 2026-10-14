import { buildFfmpegHlsArgs } from './ffmpeg-hls-args';
import {
  NvencEncoderProfile,
  X264EncoderProfile,
} from './video-encoder-profile';
import { RENDITION_LADDER } from '../../domain/rendition-ladder';

const [r1080, r720] = RENDITION_LADDER;

function build(hasAudio: boolean, encoder = new NvencEncoderProfile()) {
  return buildFfmpegHlsArgs({
    inputPath: '/src/clase.mov',
    outputDir: '/out/abc.tmp',
    keyInfoPath: '/keys/enc.keyinfo',
    source: { durationSeconds: 60, width: 1920, height: 1080, hasAudio },
    renditions: [r1080, r720],
    encoder,
  });
}

const valueAfter = (args: string[], flag: string) =>
  args[args.indexOf(flag) + 1];

describe('buildFfmpegHlsArgs', () => {
  it('splits the decoded video once into one scaled 8-bit output per rendition', () => {
    expect(valueAfter(build(true), '-filter_complex')).toBe(
      '[0:v]split=2[v0][v1];' +
        '[v0]scale=-2:1080,format=yuv420p[v0out];' +
        '[v1]scale=-2:720,format=yuv420p[v1out]',
    );
  });

  it('pairs each video stream with its own copy of the audio', () => {
    const args = build(true);
    expect(valueAfter(args, '-var_stream_map')).toBe(
      'v:0,a:0,name:1080p v:1,a:1,name:720p',
    );
    expect(args.filter((a) => a === '0:a:0')).toHaveLength(2);
  });

  it('maps no audio when the source has none', () => {
    const args = build(false);
    expect(args).not.toContain('0:a:0');
    expect(args).not.toContain('-c:a');
    expect(valueAfter(args, '-var_stream_map')).toBe(
      'v:0,name:1080p v:1,name:720p',
    );
  });

  it('encrypts with the key info file and writes a VOD playlist per rendition', () => {
    const args = build(true);
    expect(valueAfter(args, '-hls_key_info_file')).toBe('/keys/enc.keyinfo');
    expect(valueAfter(args, '-hls_playlist_type')).toBe('vod');
    expect(valueAfter(args, '-hls_segment_filename')).toBe(
      '/out/abc.tmp/%v/seg_%04d.ts',
    );
    expect(args[args.length - 1]).toBe('/out/abc.tmp/%v/index.m3u8');
  });

  it('delegates the video codec to the encoder profile', () => {
    expect(valueAfter(build(true), '-c:v:0')).toBe('h264_nvenc');
    expect(valueAfter(build(true, new X264EncoderProfile()), '-c:v:1')).toBe(
      'libx264',
    );
  });

  it('caps each rendition at its peak bitrate', () => {
    const args = build(true);
    expect(valueAfter(args, '-b:v:1')).toBe('2800k');
    expect(valueAfter(args, '-maxrate:v:1')).toBe('2996k');
  });
});

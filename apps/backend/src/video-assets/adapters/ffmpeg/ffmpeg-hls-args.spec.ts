import { buildAudioEncodeArgs, buildFfmpegHlsArgs } from './ffmpeg-hls-args';
import { CpuX264Pipeline, CudaNvencPipeline } from './video-pipeline-profile';
import { RENDITION_LADDER } from '../../domain/rendition-ladder';

const [r1080, r720] = RENDITION_LADDER;

function build({
  audio = '/scratch/audio.m4a' as string | null,
  pipeline = new CudaNvencPipeline(),
  dimensions = { width: 1920, height: 1080 },
} = {}) {
  return buildFfmpegHlsArgs({
    inputPath: '/src/clase.mov',
    encodedAudioPath: audio,
    outputDir: '/out/abc.tmp',
    keyInfoPath: '/keys/enc.keyinfo',
    source: { durationSeconds: 60, ...dimensions, hasAudio: audio !== null },
    renditions: [r1080, r720],
    pipeline,
  });
}

const valueAfter = (args: string[], flag: string) =>
  args[args.indexOf(flag) + 1];

describe('buildFfmpegHlsArgs', () => {
  it('splits the decoded video once into one scaled output per rendition', () => {
    expect(
      valueAfter(build({ pipeline: new CpuX264Pipeline() }), '-filter_complex'),
    ).toBe(
      '[0:v]split=2[v0][v1];' +
        '[v0]scale=1920:1080,format=yuv420p[v0out];' +
        '[v1]scale=1280:720,format=yuv420p[v1out]',
    );
  });

  it('keeps frames on the GPU end to end with the CUDA pipeline', () => {
    const args = build();
    expect(
      args.slice(args.indexOf('-hwaccel'), args.indexOf('-i') + 2),
    ).toEqual([
      '-hwaccel',
      'cuda',
      '-hwaccel_output_format',
      'cuda',
      '-i',
      '/src/clase.mov',
    ]);
    expect(valueAfter(args, '-filter_complex')).toContain(
      '[v1]scale_cuda=1280:720:format=yuv420p[v1out]',
    );
    expect(valueAfter(args, '-c:v:0')).toBe('h264_nvenc');
  });

  it('decodes on the CPU and encodes with x264 with the CPU pipeline', () => {
    const args = build({ pipeline: new CpuX264Pipeline() });
    expect(args).not.toContain('-hwaccel');
    expect(valueAfter(args, '-c:v:1')).toBe('libx264');
  });

  it('scales portrait video by its short side', () => {
    const args = build({
      pipeline: new CpuX264Pipeline(),
      dimensions: { width: 1080, height: 1920 },
    });
    expect(valueAfter(args, '-filter_complex')).toContain(
      '[v1]scale=720:1280,format=yuv420p[v1out]',
    );
  });

  it('copies the pre-encoded audio into every rendition instead of re-encoding it', () => {
    const args = build();
    expect(args.filter((a) => a === '-i')).toHaveLength(2);
    expect(valueAfter(args, '/src/clase.mov')).toBe('-i');
    expect(args.filter((a) => a === '1:a:0')).toHaveLength(2);
    expect(valueAfter(args, '-c:a')).toBe('copy');
    expect(valueAfter(args, '-var_stream_map')).toBe(
      'v:0,a:0,name:1080p v:1,a:1,name:720p',
    );
  });

  it('maps no audio when the source has none', () => {
    const args = build({ audio: null });
    expect(args.filter((a) => a === '-i')).toHaveLength(1);
    expect(args).not.toContain('-c:a');
    expect(valueAfter(args, '-var_stream_map')).toBe(
      'v:0,name:1080p v:1,name:720p',
    );
  });

  it('encrypts with the key info file and writes a VOD playlist per rendition', () => {
    const args = build();
    expect(valueAfter(args, '-hls_key_info_file')).toBe('/keys/enc.keyinfo');
    expect(valueAfter(args, '-hls_playlist_type')).toBe('vod');
    expect(valueAfter(args, '-hls_segment_filename')).toBe(
      '/out/abc.tmp/%v/seg_%04d.ts',
    );
    expect(args[args.length - 1]).toBe('/out/abc.tmp/%v/index.m3u8');
  });

  it('caps each rendition at its peak bitrate', () => {
    const args = build();
    expect(valueAfter(args, '-b:v:1')).toBe('2800k');
    expect(valueAfter(args, '-maxrate:v:1')).toBe('2996k');
  });
});

describe('buildAudioEncodeArgs', () => {
  it('drops the video and encodes stereo AAC at the declared bitrate', () => {
    const args = buildAudioEncodeArgs('/src/clase.mov', '/scratch/audio.m4a');
    expect(args).toContain('-vn');
    expect(valueAfter(args, '-c:a')).toBe('aac');
    expect(valueAfter(args, '-b:a')).toBe('128k');
    expect(valueAfter(args, '-ac')).toBe('2');
    expect(args[args.length - 1]).toBe('/scratch/audio.m4a');
  });
});

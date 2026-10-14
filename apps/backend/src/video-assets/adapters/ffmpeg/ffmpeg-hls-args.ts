import { AUDIO_BITRATE_KBPS } from '../../domain/master-playlist';
import { Rendition, outputDimensions } from '../../domain/rendition-ladder';
import { SourceVideoInfo } from './source-probe';
import { VideoEncoderProfile } from './video-encoder-profile';

export const SEGMENT_SECONDS = 6;

export interface FfmpegHlsArgsInput {
  inputPath: string;
  outputDir: string;
  keyInfoPath: string;
  source: SourceVideoInfo;
  renditions: Rendition[];
  encoder: VideoEncoderProfile;
}

/**
 * One ffmpeg run decodes the source once and writes every rendition, with
 * keyframes forced on segment boundaries so players can switch quality
 * mid-video without a glitch.
 */
export function buildFfmpegHlsArgs(input: FfmpegHlsArgsInput): string[] {
  const { renditions, source, encoder } = input;
  const n = renditions.length;

  // format=yuv420p: phones record 10-bit HDR, which 8-bit H.264 cannot take.
  const scaled = renditions
    .map((r, i) => {
      const { width, height } = outputDimensions(r, source);
      return `[v${i}]scale=${width}:${height},format=yuv420p[v${i}out]`;
    })
    .join(';');
  const filter = `[0:v]split=${n}${renditions.map((_, i) => `[v${i}]`).join('')};${scaled}`;

  const videoMaps = renditions.flatMap((r, i) => [
    '-map',
    `[v${i}out]`,
    ...encoder.videoArgs(i, r),
  ]);

  const audioMaps = source.hasAudio
    ? [
        ...renditions.flatMap(() => ['-map', '0:a:0']),
        '-c:a',
        'aac',
        '-b:a',
        `${AUDIO_BITRATE_KBPS}k`,
        '-ac',
        '2',
      ]
    : [];

  const streamMap = renditions
    .map((r, i) => `v:${i}${source.hasAudio ? `,a:${i}` : ''},name:${r.name}`)
    .join(' ');

  return [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-i',
    input.inputPath,
    '-filter_complex',
    filter,
    ...videoMaps,
    ...audioMaps,
    '-force_key_frames',
    `expr:gte(t,n_forced*${SEGMENT_SECONDS})`,
    '-f',
    'hls',
    '-hls_time',
    String(SEGMENT_SECONDS),
    '-hls_playlist_type',
    'vod',
    '-hls_key_info_file',
    input.keyInfoPath,
    '-hls_segment_filename',
    `${input.outputDir}/%v/seg_%04d.ts`,
    '-var_stream_map',
    streamMap,
    `${input.outputDir}/%v/index.m3u8`,
  ];
}

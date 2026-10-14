import { AUDIO_BITRATE_KBPS } from '../../domain/master-playlist';
import { Rendition, outputDimensions } from '../../domain/rendition-ladder';
import { SourceVideoInfo } from './source-probe';
import { VideoPipelineProfile } from './video-pipeline-profile';

export const SEGMENT_SECONDS = 6;

/**
 * Encodes the audio once, ahead of the video run. Every rendition carries the
 * same audio, and encoding it once per rendition inside the video run made
 * that run three times slower: the AAC encoder is single-threaded.
 */
export function buildAudioEncodeArgs(
  inputPath: string,
  outputPath: string,
): string[] {
  return [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-i',
    inputPath,
    '-vn',
    '-c:a',
    'aac',
    '-b:a',
    `${AUDIO_BITRATE_KBPS}k`,
    '-ac',
    '2',
    outputPath,
  ];
}

export interface FfmpegHlsArgsInput {
  inputPath: string;
  /** Output of buildAudioEncodeArgs; null when the source has no audio. */
  encodedAudioPath: string | null;
  outputDir: string;
  keyInfoPath: string;
  source: SourceVideoInfo;
  renditions: Rendition[];
  pipeline: VideoPipelineProfile;
}

/**
 * One ffmpeg run decodes the source once and writes every rendition, with
 * keyframes forced on segment boundaries so players can switch quality
 * mid-video without a glitch.
 */
export function buildFfmpegHlsArgs(input: FfmpegHlsArgsInput): string[] {
  const { renditions, source, pipeline, encodedAudioPath } = input;
  const n = renditions.length;

  const scaled = renditions
    .map(
      (r, i) =>
        `[v${i}]${pipeline.scaleFilter(outputDimensions(r, source))}[v${i}out]`,
    )
    .join(';');
  const filter = `[0:v]split=${n}${renditions.map((_, i) => `[v${i}]`).join('')};${scaled}`;

  const videoMaps = renditions.flatMap((r, i) => [
    '-map',
    `[v${i}out]`,
    ...pipeline.videoArgs(i, r),
  ]);

  const audioInput = encodedAudioPath ? ['-i', encodedAudioPath] : [];
  const audioMaps = encodedAudioPath
    ? [...renditions.flatMap(() => ['-map', '1:a:0']), '-c:a', 'copy']
    : [];

  const streamMap = renditions
    .map((r, i) => `v:${i}${encodedAudioPath ? `,a:${i}` : ''},name:${r.name}`)
    .join(' ');

  return [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    ...pipeline.decodeArgs(),
    '-i',
    input.inputPath,
    ...audioInput,
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

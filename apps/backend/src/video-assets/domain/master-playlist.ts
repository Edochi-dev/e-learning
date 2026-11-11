import {
  Dimensions,
  Rendition,
  outputDimensions,
  peakBitrateKbps,
} from './rendition-ladder';

export const AUDIO_BITRATE_KBPS = 128;

/** H.264 High@4.0 and AAC-LC, matching what the pipeline profiles produce. */
const CODECS_WITH_AUDIO = 'avc1.640028,mp4a.40.2';
const CODECS_VIDEO_ONLY = 'avc1.640028';

export interface MasterPlaylistInput {
  renditions: Rendition[];
  source: Dimensions;
  hasAudio: boolean;
}

/**
 * Written by us rather than by ffmpeg's -master_pl_name so that its contents
 * (and the relative variant paths the API rewrites) do not depend on ffmpeg
 * version quirks.
 */
export function buildMasterPlaylist(input: MasterPlaylistInput): string {
  const lines = ['#EXTM3U', '#EXT-X-VERSION:3'];
  for (const r of input.renditions) {
    const peakKbps =
      peakBitrateKbps(r) + (input.hasAudio ? AUDIO_BITRATE_KBPS : 0);
    const { width, height } = outputDimensions(r, input.source);
    lines.push(
      `#EXT-X-STREAM-INF:BANDWIDTH=${peakKbps * 1000},` +
        `RESOLUTION=${width}x${height},` +
        `CODECS="${input.hasAudio ? CODECS_WITH_AUDIO : CODECS_VIDEO_ONLY}"`,
      `${r.name}/index.m3u8`,
    );
  }
  return `${lines.join('\n')}\n`;
}

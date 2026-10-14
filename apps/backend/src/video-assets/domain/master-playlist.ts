import { Rendition, peakBitrateKbps } from './rendition-ladder';

export const AUDIO_BITRATE_KBPS = 128;

/** H.264 High@4.0 and AAC-LC, matching what the encoder profiles produce. */
const CODECS_WITH_AUDIO = 'avc1.640028,mp4a.40.2';
const CODECS_VIDEO_ONLY = 'avc1.640028';

export interface MasterPlaylistInput {
  renditions: Rendition[];
  sourceWidth: number;
  sourceHeight: number;
  hasAudio: boolean;
}

/** Width after scaling to the rendition height, rounded to even like `-2`. */
export function scaledWidth(
  rendition: Rendition,
  sourceWidth: number,
  sourceHeight: number,
): number {
  return Math.round((sourceWidth * rendition.height) / sourceHeight / 2) * 2;
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
    const width = scaledWidth(r, input.sourceWidth, input.sourceHeight);
    lines.push(
      `#EXT-X-STREAM-INF:BANDWIDTH=${peakKbps * 1000},` +
        `RESOLUTION=${width}x${r.height},` +
        `CODECS="${input.hasAudio ? CODECS_WITH_AUDIO : CODECS_VIDEO_ONLY}"`,
      `${r.name}/index.m3u8`,
    );
  }
  return `${lines.join('\n')}\n`;
}

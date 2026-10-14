export interface Rendition {
  /** Also the directory name inside the asset and the playlist label. */
  name: string;
  /** "1080p" names the short side, so portrait 1080p is 1080x1920. */
  shortSide: number;
  videoBitrateKbps: number;
}

export interface Dimensions {
  width: number;
  height: number;
}

/** Highest first, the order in which the master playlist lists them. */
export const RENDITION_LADDER: readonly Rendition[] = [
  { name: '1080p', shortSide: 1080, videoBitrateKbps: 5000 },
  { name: '720p', shortSide: 720, videoBitrateKbps: 2800 },
  { name: '480p', shortSide: 480, videoBitrateKbps: 1400 },
];

/** VBV ceiling the encoder may burst to; also what BANDWIDTH must declare. */
export function peakBitrateKbps(rendition: Rendition): number {
  return Math.round(rendition.videoBitrateKbps * 1.07);
}

export const RENDITION_NAME_PATTERN = /^\d{3,4}p$/;

/**
 * Never upscales: a 720p source gets 720p and 480p only. A source below the
 * lowest rung still gets that one rung, so every asset has something to play.
 */
export function selectRenditions(source: Dimensions): Rendition[] {
  const sourceShortSide = Math.min(source.width, source.height);
  const fitting = RENDITION_LADDER.filter(
    (r) => r.shortSide <= sourceShortSide,
  );
  return fitting.length > 0
    ? fitting
    : [RENDITION_LADDER[RENDITION_LADDER.length - 1]];
}

/**
 * The single source of the output size: both the ffmpeg scale filter and the
 * master playlist's RESOLUTION read it, so they cannot disagree. Both sides
 * are even because H.264 with 4:2:0 chroma rejects odd dimensions.
 */
export function outputDimensions(
  rendition: Rendition,
  source: Dimensions,
): Dimensions {
  const even = (n: number) => Math.round(n / 2) * 2;
  const longSide = even(
    (Math.max(source.width, source.height) * rendition.shortSide) /
      Math.min(source.width, source.height),
  );
  return source.width >= source.height
    ? { width: longSide, height: rendition.shortSide }
    : { width: rendition.shortSide, height: longSide };
}

export interface Rendition {
  /** Also the directory name inside the asset and the playlist label. */
  name: string;
  height: number;
  videoBitrateKbps: number;
}

/** Highest first, the order in which the master playlist lists them. */
export const RENDITION_LADDER: readonly Rendition[] = [
  { name: '1080p', height: 1080, videoBitrateKbps: 5000 },
  { name: '720p', height: 720, videoBitrateKbps: 2800 },
  { name: '480p', height: 480, videoBitrateKbps: 1400 },
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
export function selectRenditions(sourceHeight: number): Rendition[] {
  const fitting = RENDITION_LADDER.filter((r) => r.height <= sourceHeight);
  return fitting.length > 0
    ? fitting
    : [RENDITION_LADDER[RENDITION_LADDER.length - 1]];
}

export interface SegmentLocation {
  assetId: string;
  rendition: string;
  segment: string;
}

/**
 * Segments are served by the web server, not by Node, so their URLs carry a
 * signature that the web server itself can check.
 */
export abstract class HlsMediaUrlSigner {
  abstract signSegmentUrl(location: SegmentLocation, expiresAt: Date): string;
}

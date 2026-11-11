export abstract class HlsPlaylistStore {
  abstract readMaster(assetId: string): Promise<string | null>;

  abstract readVariant(
    assetId: string,
    rendition: string,
  ): Promise<string | null>;
}

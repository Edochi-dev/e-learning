export abstract class HlsKeyStore {
  /** Generates a fresh AES-128 key for the asset, replacing any previous one. */
  abstract issue(assetId: string): Promise<Buffer>;

  abstract find(assetId: string): Promise<Buffer | null>;
}

import { Injectable } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { HlsPlaylistStore } from '../gateways/hls-playlist-store.gateway';
import { HlsConfig } from '../hls.config';
import { RENDITION_NAME_PATTERN } from '../domain/rendition-ladder';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class FileHlsPlaylistStore implements HlsPlaylistStore {
  constructor(private readonly config: HlsConfig) {}

  readMaster(assetId: string): Promise<string | null> {
    return this.read(assetId, 'master.m3u8');
  }

  readVariant(assetId: string, rendition: string): Promise<string | null> {
    if (!RENDITION_NAME_PATTERN.test(rendition)) return Promise.resolve(null);
    return this.read(assetId, join(rendition, 'index.m3u8'));
  }

  // Both path segments are whitelisted by pattern, so nothing a client sends
  // can escape the media directory.
  private async read(assetId: string, file: string): Promise<string | null> {
    if (!UUID_PATTERN.test(assetId)) return null;
    try {
      return await readFile(join(this.config.mediaDir, assetId, file), 'utf8');
    } catch {
      return null;
    }
  }
}

import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import {
  HlsMediaUrlSigner,
  SegmentLocation,
} from '../gateways/hls-media-url-signer.gateway';
import { HlsConfig } from '../hls.config';

/**
 * Signs for nginx's secure_link module. The hashed string must match
 * `secure_link_md5` in deploy/nginx-hls-media.conf.example byte for byte.
 *
 * MD5 is what secure_link supports. It is acceptable here because the hash
 * only gates bandwidth: the segments are AES-encrypted and useless without
 * the key, which Node hands out only against an HMAC-SHA256 playback token.
 */
@Injectable()
export class NginxSecureLinkSigner implements HlsMediaUrlSigner {
  constructor(private readonly config: HlsConfig) {}

  signSegmentUrl(location: SegmentLocation, expiresAt: Date): string {
    const expires = Math.floor(expiresAt.getTime() / 1000);
    const md5 = createHash('md5')
      .update(`${expires}${location.assetId} ${this.config.mediaSecret}`)
      .digest('base64url');

    const path = [location.assetId, location.rendition, location.segment]
      .map(encodeURIComponent)
      .join('/');
    return `${this.config.mediaBaseUrl}/${path}?md5=${md5}&expires=${expires}`;
  }
}

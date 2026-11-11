import { createHash } from 'crypto';
import { NginxSecureLinkSigner } from './nginx-secure-link-signer.adapter';
import { HlsConfig } from '../hls.config';

const ASSET = '3f2b8c1e-0d4a-4b6e-9f1a-2c3d4e5f6a7b';
const SECRET = 's'.repeat(32);

describe('NginxSecureLinkSigner', () => {
  const signer = new NginxSecureLinkSigner({
    mediaBaseUrl: '/hls-media',
    mediaSecret: SECRET,
  } as HlsConfig);

  it('produces the md5 nginx computes from "$secure_link_expires$hls_asset <secret>"', () => {
    const expiresAt = new Date('2026-10-20T12:00:00Z');
    const expires = expiresAt.getTime() / 1000;
    const md5 = createHash('md5')
      .update(`${expires}${ASSET} ${SECRET}`)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    expect(
      signer.signSegmentUrl(
        { assetId: ASSET, rendition: '720p', segment: 'seg_0003.ts' },
        expiresAt,
      ),
    ).toBe(
      `/hls-media/${ASSET}/720p/seg_0003.ts?md5=${md5}&expires=${expires}`,
    );
  });

  it('signs per asset, so every segment of an asset shares the signature', () => {
    const expiresAt = new Date('2026-10-20T12:00:00Z');
    const md5Of = (segment: string) =>
      new URL(
        signer.signSegmentUrl(
          { assetId: ASSET, rendition: '480p', segment },
          expiresAt,
        ),
        'https://x',
      ).searchParams.get('md5');

    expect(md5Of('seg_0000.ts')).toBe(md5Of('seg_0001.ts'));
  });
});

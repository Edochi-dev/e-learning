import { join } from 'path';

/**
 * Images embedded in the email itself (CID) rather than hot-linked, so they
 * show without depending on the public site and render in local tests too.
 */
export const BRAND_LOGO = {
  cid: 'brand-logo@marisnails.academy',
  filename: 'logo.png',
  path: join(__dirname, '..', 'assets', 'email-logo.png'),
} as const;

const INLINE_IMAGES = [BRAND_LOGO];

/** Attachments for the inline images an HTML body actually references. */
export function inlineImagesFor(
  htmlBody: string,
): { filename: string; path: string; cid: string }[] {
  return INLINE_IMAGES.filter((image) =>
    htmlBody.includes(`cid:${image.cid}`),
  ).map(({ filename, path, cid }) => ({ filename, path, cid }));
}

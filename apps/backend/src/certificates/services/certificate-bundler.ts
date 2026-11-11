import { ArchiveFile } from '../gateways/certificate-archive.gateway';

export const BUNDLE_LAYOUTS = ['separate', 'merged'] as const;
export type BundleLayout = (typeof BUNDLE_LAYOUTS)[number];

export interface CertificateBundle {
  buffer: Buffer;
  filename: string;
  isZip: boolean;
}

/** Packs several certificate PDFs into one download. */
export abstract class CertificateBundler {
  abstract bundle(files: ArchiveFile[]): Promise<CertificateBundle>;
}

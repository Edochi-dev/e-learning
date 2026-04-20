export interface QrCodeOptions {
  foregroundColor?: string;
  backgroundColor?: string;
  logoBuffer?: Buffer;
}

export abstract class QrCodeGateway {
  abstract generate(
    url: string,
    pixelSize: number,
    options?: QrCodeOptions,
  ): Promise<Buffer>;
}

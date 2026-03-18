export abstract class QrCodeGateway {
  abstract generate(url: string, pixelSize: number): Promise<Buffer>;
}

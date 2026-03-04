export abstract class QrCodeGateway {
    abstract generate(url: string): Promise<Buffer>;
}

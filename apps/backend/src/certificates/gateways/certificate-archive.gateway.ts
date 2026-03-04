export interface ArchiveFile {
    filename: string;
    buffer: Buffer;
}

export abstract class CertificateArchiveGateway {
    abstract createZip(files: ArchiveFile[]): Promise<Buffer>;
}

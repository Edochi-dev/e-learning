import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { CertificateGateway } from '../gateways/certificate.gateway';
import { CertificateDateStamperGateway } from '../gateways/certificate-date-stamper.gateway';
import { FileStorageGateway } from '../../storage/gateways/file-storage.gateway';
import { CertificateDate, createDateStamp } from '../value-objects';

export interface StampRequest {
  certificateId: string;
  /** md5 of the PDF as backed up. Guards against stamping a file twice. */
  expectedChecksum: string;
}

export type StampStatus =
  | 'stamped'
  | 'would-stamp'
  | 'not-found'
  | 'no-template'
  | 'checksum-mismatch';

export interface StampOutcome {
  certificateId: string;
  certificateNumber: string | null;
  status: StampStatus;
  /** md5 of the file as it is on disk after this run. */
  checksum: string | null;
}

const md5 = (bytes: Buffer) => createHash('md5').update(bytes).digest('hex');

/**
 * Prints the certificate date onto PDFs issued while their template had the
 * date hidden. Operates only on an explicit list, never on "every PDF without
 * a date", and leaves any file whose bytes differ from the backup untouched.
 */
@Injectable()
export class StampCertificateDatesUseCase {
  constructor(
    private readonly certificateGateway: CertificateGateway,
    private readonly stamperGateway: CertificateDateStamperGateway,
    private readonly fileStorageGateway: FileStorageGateway,
  ) {}

  async execute(
    requests: StampRequest[],
    options: { dryRun: boolean },
  ): Promise<StampOutcome[]> {
    const outcomes: StampOutcome[] = [];
    for (const request of requests) {
      outcomes.push(await this.stampOne(request, options.dryRun));
    }
    return outcomes;
  }

  private async stampOne(
    { certificateId, expectedChecksum }: StampRequest,
    dryRun: boolean,
  ): Promise<StampOutcome> {
    const certificate =
      await this.certificateGateway.findOneWithTemplate(certificateId);
    if (!certificate) {
      return {
        certificateId,
        certificateNumber: null,
        status: 'not-found',
        checksum: null,
      };
    }

    const outcome = (status: StampStatus, checksum: string | null) => ({
      certificateId,
      certificateNumber: certificate.certificateNumber,
      status,
      checksum,
    });

    const original = await this.fileStorageGateway.readFileByUrl(
      certificate.filePath,
    );
    const originalChecksum = md5(original);
    if (originalChecksum !== expectedChecksum) {
      return outcome('checksum-mismatch', originalChecksum);
    }
    // The date position belongs to the live template; a deleted template
    // leaves nothing to position it with.
    if (!certificate.template) {
      return outcome('no-template', originalChecksum);
    }
    if (dryRun) {
      return outcome('would-stamp', originalChecksum);
    }

    const stamped = await this.stamperGateway.stamp(
      original,
      createDateStamp(
        certificate.template.dateStyle,
        CertificateDate.fromIso(certificate.certificateDate),
      ),
    );
    await this.fileStorageGateway.overwriteByUrl(certificate.filePath, stamped);
    return outcome('stamped', md5(stamped));
  }
}

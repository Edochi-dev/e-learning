import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CertificateNumberSequenceGateway } from './gateways/certificate-number-sequence.gateway';
import { CertificateNumberSequence } from './entities/certificate-number-sequence.entity';

@Injectable()
export class CertificateNumberSequenceRepository implements CertificateNumberSequenceGateway {
  constructor(
    @InjectRepository(CertificateNumberSequence)
    private readonly repo: Repository<CertificateNumberSequence>,
  ) {}

  // A single upsert statement, so two concurrent batches can never read the
  // same value: Postgres serializes them on the row lock.
  async next(abbreviation: string): Promise<number> {
    const rows: { lastNumber: number }[] = await this.repo.query(
      `INSERT INTO "certificate_number_sequences" ("abbreviation", "lastNumber")
       VALUES ($1, 1)
       ON CONFLICT ("abbreviation")
       DO UPDATE SET "lastNumber" = "certificate_number_sequences"."lastNumber" + 1
       RETURNING "lastNumber"`,
      [abbreviation],
    );
    return rows[0].lastNumber;
  }
}

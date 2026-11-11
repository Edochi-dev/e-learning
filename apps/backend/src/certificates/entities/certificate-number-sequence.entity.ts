import { Entity, PrimaryColumn, Column } from 'typeorm';

/**
 * Last certificate number handed out per course abbreviation.
 *
 * It only moves forward: deleting a certificate never lowers it, so a number
 * printed on paper can never be reissued to someone else. Do not derive the
 * next number from the certificates table (count or max) — deletions break it.
 */
@Entity('certificate_number_sequences')
export class CertificateNumberSequence {
  @PrimaryColumn()
  abbreviation: string;

  @Column({ type: 'int' })
  lastNumber: number;
}

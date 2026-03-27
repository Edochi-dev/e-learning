import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Certificate } from './certificate.entity';
import {
  NameStyle,
  DEFAULT_NAME_STYLE,
  QrStyle,
  DEFAULT_QR_STYLE,
  DateStyle,
  DEFAULT_DATE_STYLE,
} from '../value-objects';

/**
 * CertificateTemplate — Entidad que almacena una plantilla de certificado.
 *
 * El styling se agrupa en 3 Value Objects almacenados como jsonb:
 *
 *   nameStyle → posición, font, color, alineación del NOMBRE del titular
 *   qrStyle   → posición y tamaño del código QR
 *   dateStyle → visibilidad, posición, font, color de la FECHA de emisión
 *
 * ¿Por qué jsonb en vez de columnas planas?
 *
 *   Antes había 16+ columnas de styling sueltas (namePositionX, namePositionY,
 *   nameFontSize, nameColor, fontFamily, nameAlign, qrPositionX, ...).
 *   Eso es una code smell: campos que SIEMPRE se leen y escriben juntos
 *   deberían estar agrupados.
 *
 *   jsonb es ideal aquí porque:
 *   - Estos campos nunca se filtran individualmente (no hay WHERE nameFontSize > 20)
 *   - Se leen y escriben como una unidad (el picker visual los guarda todos de golpe)
 *   - PostgreSQL maneja jsonb de forma eficiente y nativa
 */
@Entity('certificate_templates')
export class CertificateTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  courseAbbreviation: string;

  @Column()
  filePath: string;

  @Column('float')
  pageWidth: number;

  @Column('float')
  pageHeight: number;

  @Column({ default: 'A4' })
  paperFormat: string;

  // ── Value Objects (jsonb) ─────────────────────────────────────────────

  @Column('jsonb', { default: DEFAULT_NAME_STYLE })
  nameStyle: NameStyle;

  @Column('jsonb', { default: DEFAULT_QR_STYLE })
  qrStyle: QrStyle;

  @Column('jsonb', { default: DEFAULT_DATE_STYLE })
  dateStyle: DateStyle;

  // ── Metadata ──────────────────────────────────────────────────────────

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Certificate, (cert) => cert.template)
  certificates: Certificate[];
}

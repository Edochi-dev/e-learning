import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { CertificateTemplate } from './certificate-template.entity';
import { TemplateSnapshot } from '../value-objects';

/**
 * Certificate — un certificado emitido a un alumno.
 *
 * INVARIANTE FUNDAMENTAL: un certificado es INMUTABLE una vez emitido.
 * Esto se logra de dos maneras:
 *
 *   1. El PDF rasterizado vive en disco como archivo independiente
 *      (filePath). Editar la plantilla NO regenera estos PDFs.
 *
 *   2. Los metadatos visibles de la plantilla (nombre del curso,
 *      abreviatura, formato) se congelan en `templateSnapshot` al
 *      momento de emisión. La plantilla viva puede cambiar, pero el
 *      certificado conserva el snapshot original.
 *
 * La FK `template` (templateId) se mantiene como AUDITORÍA: nos dice de
 * qué plantilla salió este certificado, SI esa plantilla todavía existe.
 * Es nullable porque al borrar una plantilla preservamos los certificados
 * (unlinkAllFromTemplate). Toda la información user-facing del certificado
 * vive en `templateSnapshot`, NO en `template`.
 *
 * Por eso `eager` está apagado: si lo dejáramos eager, el riesgo es que
 * algún developer despistado lea `cert.template.name` y muestre el nombre
 * actual de la plantilla en lugar del snapshot. Forzar lazy obliga a ser
 * explícito y consciente del trade-off.
 */
@Entity('certificates')
export class Certificate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  certificateNumber: string;

  @Column()
  recipientName: string;

  /**
   * Snapshot inmutable de los metadatos de la plantilla en el momento
   * de emisión. Esta es la FUENTE DE VERDAD para todo lo que se muestra
   * al usuario sobre la plantilla del certificado.
   */
  @Column('jsonb')
  templateSnapshot: TemplateSnapshot;

  /**
   * FK opcional a la plantilla viva. Solo para auditoría.
   * Puede ser null si la plantilla fue borrada.
   * NO usar para mostrar datos al usuario — usar templateSnapshot.
   */
  @ManyToOne(() => CertificateTemplate, (template) => template.certificates, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'templateId' })
  template: CertificateTemplate | null;

  @Column()
  filePath: string;

  @CreateDateColumn()
  issuedAt: Date;
}

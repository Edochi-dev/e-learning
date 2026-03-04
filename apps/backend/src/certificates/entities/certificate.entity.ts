import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { CertificateTemplate } from './certificate-template.entity';

@Entity('certificates')
export class Certificate {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    certificateNumber: string;

    @Column()
    recipientName: string;

    @ManyToOne(() => CertificateTemplate, (template) => template.certificates, { eager: true })
    @JoinColumn({ name: 'templateId' })
    template: CertificateTemplate;

    @Column()
    filePath: string;

    @CreateDateColumn()
    issuedAt: Date;
}

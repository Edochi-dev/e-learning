import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Certificate } from './certificate.entity';

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

    @Column('float', { default: 0 })
    namePositionX: number;

    @Column('float', { default: 0 })
    namePositionY: number;

    @Column('int', { default: 28 })
    nameFontSize: number;

    @Column({ default: '#000000' })
    nameColor: string;

    @Column('float', { default: 0 })
    qrPositionX: number;

    @Column('float', { default: 0 })
    qrPositionY: number;

    @Column('float', { default: 80 })
    qrSize: number;

    // Clave del enum StandardFonts de pdf-lib (ej: 'Helvetica') o nombre del archivo TTF custom
    @Column({ default: 'Helvetica' })
    fontFamily: string;

    // Formato del papel: 'A4' o 'A3'
    @Column({ default: 'A4' })
    paperFormat: string;

    @CreateDateColumn()
    createdAt: Date;

    @OneToMany(() => Certificate, (cert) => cert.template)
    certificates: Certificate[];
}

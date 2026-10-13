import { createHash } from 'crypto';
import { Test } from '@nestjs/testing';
import { StampCertificateDatesUseCase } from './stamp-certificate-dates.use-case';
import { CertificateGateway } from '../gateways/certificate.gateway';
import { CertificateDateStamperGateway } from '../gateways/certificate-date-stamper.gateway';
import { FileStorageGateway } from '../../storage/gateways/file-storage.gateway';
import { Certificate } from '../entities/certificate.entity';

const md5 = (s: string) =>
  createHash('md5').update(Buffer.from(s)).digest('hex');

describe('StampCertificateDatesUseCase', () => {
  let useCase: StampCertificateDatesUseCase;
  let findOneWithTemplate: jest.Mock;
  let stamp: jest.Mock;
  let readFileByUrl: jest.Mock;
  let overwriteByUrl: jest.Mock;

  const certificate = {
    id: 'cert-1',
    certificateNumber: 'LDCP-00001',
    filePath: '/static/certificates/generated/cert-1.pdf',
    certificateDate: '2026-04-20',
    template: {
      dateStyle: {
        positionX: 169,
        positionY: 501,
        fontSize: 10,
        color: '#000000',
        fontFamily: 'Helvetica',
        align: 'left',
      },
    },
  } as unknown as Certificate;

  const request = {
    certificateId: 'cert-1',
    expectedChecksum: md5('original'),
  };

  beforeEach(async () => {
    findOneWithTemplate = jest.fn().mockResolvedValue(certificate);
    stamp = jest.fn().mockResolvedValue(Buffer.from('stamped'));
    readFileByUrl = jest.fn().mockResolvedValue(Buffer.from('original'));
    overwriteByUrl = jest.fn().mockResolvedValue(undefined);

    const module = await Test.createTestingModule({
      providers: [
        StampCertificateDatesUseCase,
        { provide: CertificateGateway, useValue: { findOneWithTemplate } },
        { provide: CertificateDateStamperGateway, useValue: { stamp } },
        {
          provide: FileStorageGateway,
          useValue: { readFileByUrl, overwriteByUrl },
        },
      ],
    }).compile();

    useCase = module.get(StampCertificateDatesUseCase);
  });

  it('estampa la fecha del certificado con el estilo de su plantilla', async () => {
    const [outcome] = await useCase.execute([request], { dryRun: false });

    expect(stamp).toHaveBeenCalledWith(Buffer.from('original'), {
      text: '20/04/2026',
      position: { x: 169, y: 501 },
      fontSize: 10,
      color: '#000000',
      fontFamily: 'Helvetica',
      align: 'left',
    });
    expect(overwriteByUrl).toHaveBeenCalledWith(
      certificate.filePath,
      Buffer.from('stamped'),
    );
    expect(outcome).toEqual({
      certificateId: 'cert-1',
      certificateNumber: 'LDCP-00001',
      status: 'stamped',
      checksum: md5('stamped'),
    });
  });

  it('en simulación no escribe nada', async () => {
    const [outcome] = await useCase.execute([request], { dryRun: true });

    expect(outcome.status).toBe('would-stamp');
    expect(stamp).not.toHaveBeenCalled();
    expect(overwriteByUrl).not.toHaveBeenCalled();
  });

  it('NO toca un PDF cuyo md5 no coincide con el respaldado (p. ej. ya estampado)', async () => {
    readFileByUrl.mockResolvedValue(Buffer.from('ya estampado'));

    const [outcome] = await useCase.execute([request], { dryRun: false });

    expect(outcome).toMatchObject({
      status: 'checksum-mismatch',
      checksum: md5('ya estampado'),
    });
    expect(overwriteByUrl).not.toHaveBeenCalled();
  });

  it('omite certificados cuya plantilla ya no existe', async () => {
    findOneWithTemplate.mockResolvedValue({ ...certificate, template: null });

    const [outcome] = await useCase.execute([request], { dryRun: false });

    expect(outcome.status).toBe('no-template');
    expect(overwriteByUrl).not.toHaveBeenCalled();
  });

  it('informa los ids inexistentes y sigue con el resto', async () => {
    findOneWithTemplate
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(certificate);

    const outcomes = await useCase.execute(
      [{ certificateId: 'missing', expectedChecksum: 'x' }, request],
      { dryRun: false },
    );

    expect(outcomes.map((o) => o.status)).toEqual(['not-found', 'stamped']);
  });
});

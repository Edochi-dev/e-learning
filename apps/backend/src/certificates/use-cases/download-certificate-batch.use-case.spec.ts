import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DownloadCertificateBatchUseCase } from './download-certificate-batch.use-case';
import { CertificateGateway } from '../gateways/certificate.gateway';
import { CertificateArchiveGateway } from '../gateways/certificate-archive.gateway';
import { Certificate } from '../entities/certificate.entity';

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

import { readFile } from 'fs/promises';
const readFileMock = readFile as jest.MockedFunction<typeof readFile>;

describe('DownloadCertificateBatchUseCase', () => {
  let useCase: DownloadCertificateBatchUseCase;
  let certGateway: jest.Mocked<CertificateGateway>;
  let archiveGateway: jest.Mocked<CertificateArchiveGateway>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        DownloadCertificateBatchUseCase,
        {
          provide: CertificateGateway,
          useValue: { findOne: jest.fn() },
        },
        {
          provide: CertificateArchiveGateway,
          useValue: { createZip: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(DownloadCertificateBatchUseCase);
    certGateway = module.get(CertificateGateway);
    archiveGateway = module.get(CertificateArchiveGateway);
  });

  it('lanza NotFoundException si algún certificado no existe en la BD', async () => {
    certGateway.findOne.mockResolvedValue(null);

    await expect(useCase.execute(['id-inexistente'])).rejects.toThrow(
      NotFoundException,
    );
  });

  it('retorna el PDF directamente (isZip: false) cuando se solicita un único certificado', async () => {
    const pdfBuffer = Buffer.from('pdf-content');
    certGateway.findOne.mockResolvedValue({
      id: 'c1',
      certificateNumber: 'MR-00001',
      recipientName: 'Ana García',
      filePath: '/static/certificates/generated/c1.pdf',
    } as Certificate);
    readFileMock.mockResolvedValue(pdfBuffer);

    const result = await useCase.execute(['c1']);

    expect(result.isZip).toBe(false);
    expect(result.buffer).toBe(pdfBuffer);
    expect(result.filename).toBe('MR-00001 - Ana García.pdf');
    expect(archiveGateway.createZip).not.toHaveBeenCalled();
  });

  it('retorna un ZIP (isZip: true) cuando se solicitan múltiples certificados', async () => {
    const zipBuffer = Buffer.from('zip-content');
    certGateway.findOne
      .mockResolvedValueOnce({
        id: 'c1',
        certificateNumber: 'MR-00001',
        recipientName: 'Ana García',
        filePath: '/static/certificates/generated/c1.pdf',
      } as Certificate)
      .mockResolvedValueOnce({
        id: 'c2',
        certificateNumber: 'MR-00002',
        recipientName: 'Luis Pérez',
        filePath: '/static/certificates/generated/c2.pdf',
      } as Certificate);

    readFileMock.mockResolvedValue(Buffer.from('pdf'));
    archiveGateway.createZip.mockResolvedValue(zipBuffer);

    const result = await useCase.execute(['c1', 'c2']);

    expect(result.isZip).toBe(true);
    expect(result.buffer).toBe(zipBuffer);
    expect(result.filename).toBe('certificados.zip');
    expect(archiveGateway.createZip).toHaveBeenCalledTimes(1);
  });

  it('propaga el error si el archivo PDF no existe en disco (BD desincronizada del filesystem)', async () => {
    // Edge case crítico en producción: el registro existe en BD pero el archivo fue borrado manualmente
    certGateway.findOne.mockResolvedValue({
      id: 'c1',
      certificateNumber: 'MR-00001',
      recipientName: 'Ana García',
      filePath: '/static/certificates/generated/c1.pdf',
    } as Certificate);
    readFileMock.mockRejectedValue(
      new Error('ENOENT: no such file or directory'),
    );

    await expect(useCase.execute(['c1'])).rejects.toThrow('ENOENT');
  });

  it('sanitiza correctamente caracteres especiales en el nombre del destinatario para el nombre de archivo', async () => {
    // Nombre con caracteres que no deben aparecer en un filename (ej: slashes, comillas)
    certGateway.findOne.mockResolvedValue({
      id: 'c1',
      certificateNumber: 'MR-00001',
      recipientName: 'Ana "García" / López',
      filePath: '/static/certificates/generated/c1.pdf',
    } as Certificate);
    readFileMock.mockResolvedValue(Buffer.from('pdf'));

    const result = await useCase.execute(['c1']);

    // El regex /[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g elimina comillas y slash
    expect(result.filename).toBe('MR-00001 - Ana García  López.pdf');
    expect(result.isZip).toBe(false);
  });
});

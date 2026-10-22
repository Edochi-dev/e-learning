import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GenerateBlankCertificatesUseCase } from './generate-blank-certificates.use-case';
import { CertificateTemplateGateway } from '../gateways/certificate-template.gateway';
import { CertificateDateStamperGateway } from '../gateways/certificate-date-stamper.gateway';
import { PdfMergerGateway } from '../gateways/pdf-merger.gateway';
import { CertificateGeneratorGateway } from '../gateways/certificate-generator.gateway';
import { CertificateGateway } from '../gateways/certificate.gateway';
import { CertificateNumberSequenceGateway } from '../gateways/certificate-number-sequence.gateway';
import { FileStorageGateway } from '../../storage/gateways/file-storage.gateway';
import { CertificateTemplate } from '../entities/certificate-template.entity';

describe('GenerateBlankCertificatesUseCase', () => {
  let useCase: GenerateBlankCertificatesUseCase;
  let templateGateway: jest.Mocked<CertificateTemplateGateway>;
  const stamp = jest.fn();
  const merge = jest.fn();
  const readFileByUrl = jest.fn();
  const saveBuffer = jest.fn();
  const generate = jest.fn();
  const createCertificate = jest.fn();
  const nextNumber = jest.fn();

  const template = {
    id: 'tpl-1',
    courseAbbreviation: 'MIEAP',
    filePath: '/static/certificates/templates/tpl-1.pdf',
    dateStyle: {
      positionX: 297,
      positionY: 463,
      fontSize: 18,
      color: '#1a1a1a',
      fontFamily: 'Helvetica',
      align: 'center',
    },
  } as CertificateTemplate;

  beforeEach(async () => {
    jest.clearAllMocks();
    readFileByUrl.mockResolvedValue(Buffer.from('tpl'));
    stamp.mockResolvedValue(Buffer.from('dated'));
    merge.mockResolvedValue(Buffer.from('copies'));

    const module = await Test.createTestingModule({
      providers: [
        GenerateBlankCertificatesUseCase,
        {
          provide: CertificateTemplateGateway,
          useValue: { findOne: jest.fn() },
        },
        { provide: CertificateDateStamperGateway, useValue: { stamp } },
        { provide: PdfMergerGateway, useValue: { merge } },
        {
          provide: FileStorageGateway,
          useValue: { readFileByUrl, saveBuffer },
        },
        // Present only to prove they are never touched.
        { provide: CertificateGeneratorGateway, useValue: { generate } },
        {
          provide: CertificateGateway,
          useValue: { create: createCertificate },
        },
        {
          provide: CertificateNumberSequenceGateway,
          useValue: { next: nextNumber },
        },
      ],
    }).compile();
    useCase = module.get(GenerateBlankCertificatesUseCase);
    templateGateway = module.get(CertificateTemplateGateway);
  });

  it('estampa la fecha sobre la plantilla y la repite N veces', async () => {
    templateGateway.findOne.mockResolvedValue(template);

    const result = await useCase.execute('tpl-1', {
      certificateDate: '2026-11-07',
      copies: 5,
    });

    expect(readFileByUrl).toHaveBeenCalledWith(template.filePath);
    expect(stamp).toHaveBeenCalledWith(Buffer.from('tpl'), {
      text: '07/11/2026',
      position: { x: 297, y: 463 },
      fontSize: 18,
      color: '#1a1a1a',
      fontFamily: 'Helvetica',
      align: 'center',
    });
    expect(merge).toHaveBeenCalledWith(Array(5).fill(Buffer.from('dated')));
    expect(result).toEqual({
      pdf: Buffer.from('copies'),
      filename: 'MIEAP en blanco 2026-11-07.pdf',
    });
  });

  it('no emite nada: ni QR, ni número, ni fila, ni archivo guardado', async () => {
    templateGateway.findOne.mockResolvedValue(template);

    await useCase.execute('tpl-1', {
      certificateDate: '2026-11-07',
      copies: 2,
    });

    expect(generate).not.toHaveBeenCalled();
    expect(nextNumber).not.toHaveBeenCalled();
    expect(createCertificate).not.toHaveBeenCalled();
    expect(saveBuffer).not.toHaveBeenCalled();
  });

  it('una plantilla inexistente responde 404', async () => {
    templateGateway.findOne.mockResolvedValue(null);

    await expect(
      useCase.execute('nope', { certificateDate: '2026-11-07', copies: 1 }),
    ).rejects.toThrow(NotFoundException);
    expect(stamp).not.toHaveBeenCalled();
  });
});

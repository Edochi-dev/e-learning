import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GenerateCertificateBatchUseCase } from './generate-certificate-batch.use-case';
import { CertificateRenderer } from '../services/certificate-renderer';
import { CertificateGateway } from '../gateways/certificate.gateway';
import { CertificateNumberSequenceGateway } from '../gateways/certificate-number-sequence.gateway';
import { CertificateTemplateGateway } from '../gateways/certificate-template.gateway';
import { CertificateGeneratorGateway } from '../gateways/certificate-generator.gateway';
import { QrCodeGateway } from '../gateways/qr-code.gateway';
import { FileStorageGateway } from '../../storage/gateways/file-storage.gateway';
import { CertificateTemplate } from '../entities/certificate-template.entity';
import { Certificate } from '../entities/certificate.entity';

/**
 * Tests para GenerateCertificateBatchUseCase — generación masiva de certificados.
 *
 * Después del refactor:
 *   - Ya no mockea fs/promises (mkdir, writeFile)
 *   - Usa FileStorageGateway.readFileByUrl para leer la plantilla
 *   - Usa FileStorageGateway.saveBuffer para guardar los PDFs generados
 *   - El template se pasa como Buffer al generator (no como ruta del filesystem)
 */

jest.mock('crypto', () => ({
  randomUUID: jest.fn().mockReturnValue('cert-uuid-123'),
}));

describe('GenerateCertificateBatchUseCase', () => {
  let useCase: GenerateCertificateBatchUseCase;
  let templateGateway: jest.Mocked<CertificateTemplateGateway>;
  let certGateway: jest.Mocked<CertificateGateway>;
  let numberSequence: jest.Mocked<CertificateNumberSequenceGateway>;
  let generatorGateway: jest.Mocked<CertificateGeneratorGateway>;
  let qrGateway: jest.Mocked<QrCodeGateway>;
  let fileStorageGateway: jest.Mocked<FileStorageGateway>;
  let configService: jest.Mocked<ConfigService>;

  const fakeTemplate = {
    id: 'tpl-1',
    name: 'Manicure Ruso',
    courseAbbreviation: 'MR',
    paperFormat: 'A4 Horizontal',
    filePath: '/static/certificates/templates/tpl-1.pdf',
    nameStyle: {
      positionX: 100,
      positionY: 200,
      fontSize: 28,
      color: '#000000',
      fontFamily: 'Helvetica',
      align: 'left' as const,
    },
    qrStyle: {
      positionX: 50,
      positionY: 50,
      size: 80,
    },
    dateStyle: {
      positionX: 0,
      positionY: 0,
      fontSize: 18,
      color: '#000000',
      fontFamily: 'Helvetica',
      align: 'left' as const,
    },
  } as CertificateTemplate;

  const templateBuffer = Buffer.from('fake-template-pdf');

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        GenerateCertificateBatchUseCase,
        // Real: solo combina los gateways de QR y PDF simulados abajo.
        CertificateRenderer,
        {
          provide: CertificateTemplateGateway,
          useValue: { findOne: jest.fn() },
        },
        {
          provide: CertificateGateway,
          useValue: { create: jest.fn() },
        },
        {
          provide: CertificateNumberSequenceGateway,
          useValue: { next: jest.fn() },
        },
        {
          provide: CertificateGeneratorGateway,
          useValue: { generate: jest.fn() },
        },
        {
          provide: QrCodeGateway,
          useValue: { generate: jest.fn() },
        },
        {
          provide: FileStorageGateway,
          useValue: {
            readFileByUrl: jest.fn(),
            saveBuffer: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(GenerateCertificateBatchUseCase);
    templateGateway = module.get(CertificateTemplateGateway);
    certGateway = module.get(CertificateGateway);
    numberSequence = module.get(CertificateNumberSequenceGateway);
    generatorGateway = module.get(CertificateGeneratorGateway);
    qrGateway = module.get(QrCodeGateway);
    fileStorageGateway = module.get(FileStorageGateway);
    configService = module.get(ConfigService);

    // Default: readFileByUrl retorna el buffer de la plantilla
    fileStorageGateway.readFileByUrl.mockResolvedValue(templateBuffer);
    // Default: saveBuffer retorna la URL pública del PDF guardado
    fileStorageGateway.saveBuffer.mockResolvedValue(
      '/static/certificates/generated/cert-uuid-123.pdf',
    );
  });

  it('lanza NotFoundException si la plantilla no existe', async () => {
    templateGateway.findOne.mockResolvedValue(null);

    await expect(
      useCase.execute({
        certificateDate: '2026-10-08',
        templateId: 'tpl-inexistente',
        recipients: [{ name: 'Ana' }],
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('lee la plantilla via readFileByUrl (no accede al filesystem directamente)', async () => {
    templateGateway.findOne.mockResolvedValue(fakeTemplate);
    configService.get.mockReturnValue('http://localhost:5173');
    numberSequence.next.mockResolvedValue(1);
    qrGateway.generate.mockResolvedValue(Buffer.from('qr'));
    generatorGateway.generate.mockResolvedValue(Buffer.from('pdf'));
    certGateway.create.mockImplementation(
      async (data) => ({ ...data }) as Certificate,
    );

    await useCase.execute({
      certificateDate: '2026-10-08',
      templateId: 'tpl-1',
      recipients: [{ name: 'Ana' }],
    });

    expect(fileStorageGateway.readFileByUrl).toHaveBeenCalledWith(
      '/static/certificates/templates/tpl-1.pdf',
    );
  });

  it('guarda los PDFs generados via saveBuffer (no accede al filesystem directamente)', async () => {
    templateGateway.findOne.mockResolvedValue(fakeTemplate);
    configService.get.mockReturnValue('http://localhost:5173');
    numberSequence.next.mockResolvedValue(1);
    qrGateway.generate.mockResolvedValue(Buffer.from('qr'));
    generatorGateway.generate.mockResolvedValue(Buffer.from('pdf'));
    certGateway.create.mockImplementation(
      async (data) => ({ ...data }) as Certificate,
    );

    await useCase.execute({
      certificateDate: '2026-10-08',
      templateId: 'tpl-1',
      recipients: [{ name: 'Ana' }],
    });

    expect(fileStorageGateway.saveBuffer).toHaveBeenCalledWith(
      Buffer.from('pdf'),
      'certificates/generated',
      'cert-uuid-123.pdf',
    );
  });

  it('retorna array vacío si todos los nombres son solo espacios en blanco', async () => {
    templateGateway.findOne.mockResolvedValue(fakeTemplate);
    configService.get.mockReturnValue('http://localhost:5173');

    const result = await useCase.execute({
      certificateDate: '2026-10-08',
      templateId: 'tpl-1',
      recipients: [{ name: '   ' }, { name: '\t' }, { name: '' }],
    });

    expect(result).toEqual([]);
    expect(certGateway.create).not.toHaveBeenCalled();
  });

  it('omite nombres vacíos y procesa solo los válidos en un lote mixto', async () => {
    templateGateway.findOne.mockResolvedValue(fakeTemplate);
    configService.get.mockReturnValue('http://localhost:5173');
    numberSequence.next.mockResolvedValue(1);
    qrGateway.generate.mockResolvedValue(Buffer.from('qr'));
    generatorGateway.generate.mockResolvedValue(Buffer.from('pdf'));
    certGateway.create.mockResolvedValue({
      id: 'cert-uuid-123',
      certificateNumber: 'MR-00001',
      recipientName: 'Ana García',
    } as Certificate);

    const result = await useCase.execute({
      certificateDate: '2026-10-08',
      templateId: 'tpl-1',
      recipients: [
        { name: '   ' },
        { name: 'Ana García' },
        { name: '' },
        { name: '  ' },
      ],
    });

    expect(result).toHaveLength(1);
    expect(result[0].recipientName).toBe('Ana García');
  });

  it('genera el número de certificado con el formato ABREVIATURA-NNNNN', async () => {
    templateGateway.findOne.mockResolvedValue(fakeTemplate);
    configService.get.mockReturnValue('http://localhost:5173');
    numberSequence.next.mockResolvedValue(43);
    qrGateway.generate.mockResolvedValue(Buffer.from('qr'));
    generatorGateway.generate.mockResolvedValue(Buffer.from('pdf'));
    certGateway.create.mockImplementation(
      async (data) => ({ ...data }) as Certificate,
    );

    const result = await useCase.execute({
      certificateDate: '2026-10-08',
      templateId: 'tpl-1',
      recipients: [{ name: 'Luis' }],
    });

    expect(result[0].certificateNumber).toBe('MR-00043');
  });

  it('usa el FRONTEND_URL de ConfigService para construir la URL del QR', async () => {
    templateGateway.findOne.mockResolvedValue(fakeTemplate);
    configService.get.mockReturnValue('https://maris-nails.com');
    numberSequence.next.mockResolvedValue(1);
    qrGateway.generate.mockResolvedValue(Buffer.from('qr'));
    generatorGateway.generate.mockResolvedValue(Buffer.from('pdf'));
    certGateway.create.mockImplementation(
      async (data) => ({ ...data }) as Certificate,
    );

    await useCase.execute({
      certificateDate: '2026-10-08',
      templateId: 'tpl-1',
      recipients: [{ name: 'Ana' }],
    });

    expect(qrGateway.generate).toHaveBeenCalledWith(
      'https://maris-nails.com/certificados/cert-uuid-123',
      expect.any(Number),
      expect.objectContaining({
        foregroundColor: undefined,
        backgroundColor: undefined,
      }),
    );
  });

  it('usa http://localhost:5173 como FRONTEND_URL cuando no está configurado', async () => {
    templateGateway.findOne.mockResolvedValue(fakeTemplate);
    configService.get.mockImplementation((_key, defaultVal) => defaultVal);
    numberSequence.next.mockResolvedValue(1);
    qrGateway.generate.mockResolvedValue(Buffer.from('qr'));
    generatorGateway.generate.mockResolvedValue(Buffer.from('pdf'));
    certGateway.create.mockImplementation(
      async (data) => ({ ...data }) as Certificate,
    );

    await useCase.execute({
      certificateDate: '2026-10-08',
      templateId: 'tpl-1',
      recipients: [{ name: 'Ana' }],
    });

    expect(qrGateway.generate).toHaveBeenCalledWith(
      'http://localhost:5173/certificados/cert-uuid-123',
      expect.any(Number),
      expect.objectContaining({
        foregroundColor: undefined,
        backgroundColor: undefined,
      }),
    );
  });

  it('calcula el pixelSize del QR correctamente a 300 DPI (pts → inches → pixels)', async () => {
    const templateWith72pts = {
      ...fakeTemplate,
      qrStyle: { ...fakeTemplate.qrStyle, size: 72 },
    };
    templateGateway.findOne.mockResolvedValue(
      templateWith72pts as CertificateTemplate,
    );
    configService.get.mockReturnValue('http://localhost:5173');
    numberSequence.next.mockResolvedValue(1);
    qrGateway.generate.mockResolvedValue(Buffer.from('qr'));
    generatorGateway.generate.mockResolvedValue(Buffer.from('pdf'));
    certGateway.create.mockImplementation(
      async (data) => ({ ...data }) as Certificate,
    );

    await useCase.execute({
      certificateDate: '2026-10-08',
      templateId: 'tpl-1',
      recipients: [{ name: 'Ana' }],
    });

    expect(qrGateway.generate).toHaveBeenCalledWith(
      expect.any(String),
      300,
      expect.any(Object),
    );
  });

  it('congela el templateSnapshot al persistir el certificado (no lo lee de la plantilla viva después)', async () => {
    templateGateway.findOne.mockResolvedValue(fakeTemplate);
    configService.get.mockReturnValue('http://localhost:5173');
    numberSequence.next.mockResolvedValue(1);
    qrGateway.generate.mockResolvedValue(Buffer.from('qr'));
    generatorGateway.generate.mockResolvedValue(Buffer.from('pdf'));
    certGateway.create.mockImplementation(
      async (data) => ({ ...data }) as Certificate,
    );

    await useCase.execute({
      certificateDate: '2026-10-08',
      templateId: 'tpl-1',
      recipients: [{ name: 'Ana' }],
    });

    expect(certGateway.create).toHaveBeenCalledWith(
      expect.objectContaining({
        templateSnapshot: {
          name: 'Manicure Ruso',
          courseAbbreviation: 'MR',
          paperFormat: 'A4 Horizontal',
        },
      }),
    );
  });

  it('procesa múltiples nombres en orden secuencial y retorna todos los resúmenes', async () => {
    templateGateway.findOne.mockResolvedValue(fakeTemplate);
    configService.get.mockReturnValue('http://localhost:5173');
    numberSequence.next
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3);
    qrGateway.generate.mockResolvedValue(Buffer.from('qr'));
    generatorGateway.generate.mockResolvedValue(Buffer.from('pdf'));
    certGateway.create.mockImplementation(
      async (data) => ({ ...data }) as Certificate,
    );

    const result = await useCase.execute({
      certificateDate: '2026-10-08',
      templateId: 'tpl-1',
      recipients: [{ name: 'Ana' }, { name: 'Luis' }, { name: 'María' }],
    });

    expect(result).toHaveLength(3);
    expect(result[0].certificateNumber).toBe('MR-00001');
    expect(result[1].certificateNumber).toBe('MR-00002');
    expect(result[2].certificateNumber).toBe('MR-00003');
  });

  describe('fecha del certificado', () => {
    beforeEach(() => {
      templateGateway.findOne.mockResolvedValue(fakeTemplate);
      configService.get.mockReturnValue('http://localhost:5173');
      numberSequence.next.mockResolvedValue(1);
      qrGateway.generate.mockResolvedValue(Buffer.from('qr'));
      generatorGateway.generate.mockResolvedValue(Buffer.from('pdf'));
      certGateway.create.mockImplementation(
        async (data) => ({ ...data }) as Certificate,
      );
    });

    it('imprime y persiste la misma fecha en todo el lote', async () => {
      await useCase.execute({
        templateId: 'tpl-1',
        recipients: [{ name: 'Ana' }, { name: 'Luis' }],
        certificateDate: '2026-10-15',
      });

      expect(generatorGateway.generate).toHaveBeenCalledTimes(2);
      for (const [params] of generatorGateway.generate.mock.calls) {
        expect(params.date.text).toBe('15/10/2026');
      }
      expect(certGateway.create).toHaveBeenCalledWith(
        expect.objectContaining({ certificateDate: '2026-10-15' }),
      );
    });

    it('dibuja la fecha con el estilo y la posición de la plantilla', async () => {
      await useCase.execute({
        templateId: 'tpl-1',
        recipients: [{ name: 'Ana' }],
        certificateDate: '2026-10-15',
      });

      expect(generatorGateway.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          date: {
            text: '15/10/2026',
            position: { x: 0, y: 0 },
            fontSize: 18,
            color: '#000000',
            fontFamily: 'Helvetica',
            align: 'left',
          },
        }),
      );
    });
  });

  it('reserva el número en la secuencia del curso de la plantilla', async () => {
    templateGateway.findOne.mockResolvedValue(fakeTemplate);
    configService.get.mockReturnValue('http://localhost:5173');
    numberSequence.next.mockResolvedValue(81);
    qrGateway.generate.mockResolvedValue(Buffer.from('qr'));
    generatorGateway.generate.mockResolvedValue(Buffer.from('pdf'));
    certGateway.create.mockImplementation(
      async (data) => ({ ...data }) as Certificate,
    );

    const result = await useCase.execute({
      certificateDate: '2026-10-08',
      templateId: 'tpl-1',
      recipients: [{ name: 'Ana' }],
    });

    expect(numberSequence.next).toHaveBeenCalledWith('MR');
    expect(result[0].certificateNumber).toBe('MR-00081');
  });
});

import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GenerateCertificateBatchUseCase } from './generate-certificate-batch.use-case';
import { CertificateGateway } from '../gateways/certificate.gateway';
import { CertificateTemplateGateway } from '../gateways/certificate-template.gateway';
import { CertificateGeneratorGateway } from '../gateways/certificate-generator.gateway';
import { QrCodeGateway } from '../gateways/qr-code.gateway';
import { CertificateTemplate } from '../entities/certificate-template.entity';
import { Certificate } from '../entities/certificate.entity';

jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('crypto', () => ({
  randomUUID: jest.fn().mockReturnValue('cert-uuid-123'),
}));

describe('GenerateCertificateBatchUseCase', () => {
  let useCase: GenerateCertificateBatchUseCase;
  let templateGateway: jest.Mocked<CertificateTemplateGateway>;
  let certGateway: jest.Mocked<CertificateGateway>;
  let generatorGateway: jest.Mocked<CertificateGeneratorGateway>;
  let qrGateway: jest.Mocked<QrCodeGateway>;
  let configService: jest.Mocked<ConfigService>;

  const fakeTemplate = {
    id: 'tpl-1',
    courseAbbreviation: 'MR',
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
      show: false,
      positionX: 0,
      positionY: 0,
      fontSize: 18,
      color: '#000000',
      fontFamily: 'Helvetica',
      align: 'left' as const,
    },
  } as CertificateTemplate;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        GenerateCertificateBatchUseCase,
        {
          provide: CertificateTemplateGateway,
          useValue: { findOne: jest.fn() },
        },
        {
          provide: CertificateGateway,
          useValue: { countByAbbreviation: jest.fn(), create: jest.fn() },
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
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(GenerateCertificateBatchUseCase);
    templateGateway = module.get(CertificateTemplateGateway);
    certGateway = module.get(CertificateGateway);
    generatorGateway = module.get(CertificateGeneratorGateway);
    qrGateway = module.get(QrCodeGateway);
    configService = module.get(ConfigService);
  });

  it('lanza NotFoundException si la plantilla no existe', async () => {
    templateGateway.findOne.mockResolvedValue(null);

    await expect(
      useCase.execute({ templateId: 'tpl-inexistente', names: ['Ana'] }),
    ).rejects.toThrow(NotFoundException);
  });

  it('retorna array vacío si todos los nombres son solo espacios en blanco', async () => {
    templateGateway.findOne.mockResolvedValue(fakeTemplate);
    configService.get.mockReturnValue('http://localhost:5173');

    const result = await useCase.execute({
      templateId: 'tpl-1',
      names: ['   ', '\t', ''],
    });

    expect(result).toEqual([]);
    expect(certGateway.create).not.toHaveBeenCalled();
  });

  it('omite nombres vacíos y procesa solo los válidos en un lote mixto', async () => {
    templateGateway.findOne.mockResolvedValue(fakeTemplate);
    configService.get.mockReturnValue('http://localhost:5173');
    certGateway.countByAbbreviation.mockResolvedValue(0);
    qrGateway.generate.mockResolvedValue(Buffer.from('qr'));
    generatorGateway.generate.mockResolvedValue(Buffer.from('pdf'));
    certGateway.create.mockResolvedValue({
      id: 'cert-uuid-123',
      certificateNumber: 'MR-00001',
      recipientName: 'Ana García',
    } as Certificate);

    const result = await useCase.execute({
      templateId: 'tpl-1',
      names: ['   ', 'Ana García', '', '  '],
    });

    // Solo 1 nombre válido
    expect(result).toHaveLength(1);
    expect(result[0].recipientName).toBe('Ana García');
  });

  it('genera el número de certificado con el formato ABREVIATURA-NNNNN', async () => {
    templateGateway.findOne.mockResolvedValue(fakeTemplate);
    configService.get.mockReturnValue('http://localhost:5173');
    // Ya existen 42 certificados con esta abreviatura
    certGateway.countByAbbreviation.mockResolvedValue(42);
    qrGateway.generate.mockResolvedValue(Buffer.from('qr'));
    generatorGateway.generate.mockResolvedValue(Buffer.from('pdf'));
    certGateway.create.mockImplementation(
      async (data) => ({ ...data }) as Certificate,
    );

    const result = await useCase.execute({
      templateId: 'tpl-1',
      names: ['Luis'],
    });

    expect(result[0].certificateNumber).toBe('MR-00043');
  });

  it('usa el FRONTEND_URL de ConfigService para construir la URL del QR', async () => {
    templateGateway.findOne.mockResolvedValue(fakeTemplate);
    configService.get.mockReturnValue('https://maris-nails.com');
    certGateway.countByAbbreviation.mockResolvedValue(0);
    qrGateway.generate.mockResolvedValue(Buffer.from('qr'));
    generatorGateway.generate.mockResolvedValue(Buffer.from('pdf'));
    certGateway.create.mockImplementation(
      async (data) => ({ ...data }) as Certificate,
    );

    await useCase.execute({ templateId: 'tpl-1', names: ['Ana'] });

    // El QR debe apuntar al frontend, no al backend
    expect(qrGateway.generate).toHaveBeenCalledWith(
      'https://maris-nails.com/certificados/cert-uuid-123',
      expect.any(Number),
    );
  });

  it('usa http://localhost:5173 como FRONTEND_URL cuando no está configurado', async () => {
    templateGateway.findOne.mockResolvedValue(fakeTemplate);
    // ConfigService.get devuelve el valor por defecto cuando la key no existe
    configService.get.mockImplementation((_key, defaultVal) => defaultVal);
    certGateway.countByAbbreviation.mockResolvedValue(0);
    qrGateway.generate.mockResolvedValue(Buffer.from('qr'));
    generatorGateway.generate.mockResolvedValue(Buffer.from('pdf'));
    certGateway.create.mockImplementation(
      async (data) => ({ ...data }) as Certificate,
    );

    await useCase.execute({ templateId: 'tpl-1', names: ['Ana'] });

    expect(qrGateway.generate).toHaveBeenCalledWith(
      'http://localhost:5173/certificados/cert-uuid-123',
      expect.any(Number),
    );
  });

  it('calcula el pixelSize del QR correctamente a 300 DPI (pts → inches → pixels)', async () => {
    // qrStyle.size = 72 pts → (72/72) * 300 = 300 pixels exactos
    const templateWith72pts = {
      ...fakeTemplate,
      qrStyle: { ...fakeTemplate.qrStyle, size: 72 },
    };
    templateGateway.findOne.mockResolvedValue(
      templateWith72pts as CertificateTemplate,
    );
    configService.get.mockReturnValue('http://localhost:5173');
    certGateway.countByAbbreviation.mockResolvedValue(0);
    qrGateway.generate.mockResolvedValue(Buffer.from('qr'));
    generatorGateway.generate.mockResolvedValue(Buffer.from('pdf'));
    certGateway.create.mockImplementation(
      async (data) => ({ ...data }) as Certificate,
    );

    await useCase.execute({ templateId: 'tpl-1', names: ['Ana'] });

    expect(qrGateway.generate).toHaveBeenCalledWith(expect.any(String), 300);
  });

  it('procesa múltiples nombres en orden secuencial y retorna todos los resúmenes', async () => {
    templateGateway.findOne.mockResolvedValue(fakeTemplate);
    configService.get.mockReturnValue('http://localhost:5173');
    // Cada llamada a countByAbbreviation devuelve el count anterior (0, 1, 2)
    certGateway.countByAbbreviation
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2);
    qrGateway.generate.mockResolvedValue(Buffer.from('qr'));
    generatorGateway.generate.mockResolvedValue(Buffer.from('pdf'));
    certGateway.create.mockImplementation(
      async (data) => ({ ...data }) as Certificate,
    );

    const result = await useCase.execute({
      templateId: 'tpl-1',
      names: ['Ana', 'Luis', 'María'],
    });

    expect(result).toHaveLength(3);
    // Los números se asignan de forma correlativa basados en el count actual
    expect(result[0].certificateNumber).toBe('MR-00001');
    expect(result[1].certificateNumber).toBe('MR-00002');
    expect(result[2].certificateNumber).toBe('MR-00003');
  });

  /**
   * RACE CONDITION DOCUMENTADA:
   * Si dos requests llegan simultáneamente con la misma abreviatura, ambos hacen
   * countByAbbreviation al mismo tiempo y obtienen el mismo valor → generan el mismo
   * certificateNumber → la constraint UNIQUE en la BD rechazará el segundo insert.
   *
   * Solución futura: usar un SELECT ... FOR UPDATE o un sequence en PostgreSQL.
   * Por ahora, este test documenta el comportamiento esperado del código actual.
   */
  it('RACE CONDITION: dos requests simultáneos podrían generar el mismo certificateNumber', async () => {
    templateGateway.findOne.mockResolvedValue(fakeTemplate);
    configService.get.mockReturnValue('http://localhost:5173');

    // Ambas llamadas reciben el mismo count porque son "simultáneas"
    certGateway.countByAbbreviation.mockResolvedValue(5);
    qrGateway.generate.mockResolvedValue(Buffer.from('qr'));
    generatorGateway.generate.mockResolvedValue(Buffer.from('pdf'));

    const dbError = new Error(
      'duplicate key value violates unique constraint "UQ_certificateNumber"',
    );
    certGateway.create
      .mockResolvedValueOnce({
        id: 'uuid-1',
        certificateNumber: 'MR-00006',
        recipientName: 'Ana',
      } as Certificate)
      .mockRejectedValueOnce(dbError); // El segundo falla por duplicado

    // La primera request tiene éxito
    const r1 = await useCase.execute({ templateId: 'tpl-1', names: ['Ana'] });
    expect(r1[0].certificateNumber).toBe('MR-00006');

    // La segunda request (con el mismo count) lanzaría un error de BD
    await expect(
      useCase.execute({ templateId: 'tpl-1', names: ['Luis'] }),
    ).rejects.toThrow('duplicate key');
  });
});

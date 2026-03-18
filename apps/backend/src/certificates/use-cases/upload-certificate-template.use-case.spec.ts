import { Test } from '@nestjs/testing';
import { UploadCertificateTemplateUseCase } from './upload-certificate-template.use-case';
import { CertificateTemplateGateway } from '../gateways/certificate-template.gateway';
import { CertificateTemplate } from '../entities/certificate-template.entity';

// Mockeamos las operaciones de filesystem
jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
}));

// Mockeamos pdf-lib para no necesitar un PDF real en los tests
jest.mock('pdf-lib', () => ({
  PDFDocument: {
    load: jest.fn(),
  },
}));

// Mockeamos crypto para tener un UUID controlado
jest.mock('crypto', () => ({
  randomUUID: jest.fn().mockReturnValue('fixed-uuid'),
}));

import { PDFDocument } from 'pdf-lib';
const pdfLoadMock = PDFDocument.load as jest.MockedFunction<
  typeof PDFDocument.load
>;

describe('UploadCertificateTemplateUseCase', () => {
  let useCase: UploadCertificateTemplateUseCase;
  let gateway: jest.Mocked<CertificateTemplateGateway>;

  const fakeFile = (originalname = 'plantilla.pdf') =>
    ({
      originalname,
      buffer: Buffer.from('fake-pdf-bytes'),
    }) as Express.Multer.File;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Simula un PDF con una página de 841 x 595 pts (A4 landscape)
    pdfLoadMock.mockResolvedValue({
      getPages: () => [{ getSize: () => ({ width: 841, height: 595 }) }],
    } as unknown as any);

    const module = await Test.createTestingModule({
      providers: [
        UploadCertificateTemplateUseCase,
        {
          provide: CertificateTemplateGateway,
          useValue: { create: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(UploadCertificateTemplateUseCase);
    gateway = module.get(CertificateTemplateGateway);
  });

  it('persiste la plantilla con las dimensiones reales del PDF', async () => {
    const created = { id: 'tpl-1' } as CertificateTemplate;
    gateway.create.mockResolvedValue(created);

    await useCase.execute(
      { name: 'Manicure Básico', courseAbbreviation: 'MB', paperFormat: 'A4' },
      fakeFile(),
    );

    expect(gateway.create).toHaveBeenCalledWith(
      expect.objectContaining({
        pageWidth: 841,
        pageHeight: 595,
      }),
    );
  });

  it('convierte courseAbbreviation a mayúsculas antes de persistir', async () => {
    gateway.create.mockResolvedValue({} as CertificateTemplate);

    await useCase.execute(
      { name: 'Básico', courseAbbreviation: 'mb', paperFormat: 'A4' },
      fakeFile(),
    );

    expect(gateway.create).toHaveBeenCalledWith(
      expect.objectContaining({ courseAbbreviation: 'MB' }),
    );
  });

  it('usa .pdf como extensión por defecto si el archivo no tiene extensión', async () => {
    gateway.create.mockResolvedValue({} as CertificateTemplate);

    // Archivo sin extensión en el originalname
    await useCase.execute(
      { name: 'Test', courseAbbreviation: 'T', paperFormat: 'A4' },
      fakeFile('plantilla-sin-extension'),
    );

    expect(gateway.create).toHaveBeenCalledWith(
      expect.objectContaining({
        filePath: '/static/certificates/templates/fixed-uuid.pdf',
      }),
    );
  });

  it('usa la extensión real del archivo si viene en el originalname', async () => {
    gateway.create.mockResolvedValue({} as CertificateTemplate);

    await useCase.execute(
      { name: 'Test', courseAbbreviation: 'T', paperFormat: 'A4' },
      fakeFile('plantilla.pdf'),
    );

    expect(gateway.create).toHaveBeenCalledWith(
      expect.objectContaining({
        filePath: '/static/certificates/templates/fixed-uuid.pdf',
      }),
    );
  });

  it('lee las dimensiones de la PRIMERA página (ignora el resto en PDFs multipágina)', async () => {
    // Un PDF de 3 páginas con dimensiones distintas — debe leer solo la primera
    pdfLoadMock.mockResolvedValue({
      getPages: () => [
        { getSize: () => ({ width: 595, height: 842 }) }, // primera página: A4 portrait
        { getSize: () => ({ width: 1000, height: 2000 }) }, // segunda
        { getSize: () => ({ width: 500, height: 700 }) }, // tercera
      ],
    } as unknown as any);

    gateway.create.mockResolvedValue({} as CertificateTemplate);

    await useCase.execute(
      { name: 'Multi', courseAbbreviation: 'M', paperFormat: 'A4' },
      fakeFile(),
    );

    expect(gateway.create).toHaveBeenCalledWith(
      expect.objectContaining({ pageWidth: 595, pageHeight: 842 }),
    );
  });
});

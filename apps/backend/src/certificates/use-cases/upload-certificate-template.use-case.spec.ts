import { Test } from '@nestjs/testing';
import { UploadCertificateTemplateUseCase } from './upload-certificate-template.use-case';
import { CertificateTemplateGateway } from '../gateways/certificate-template.gateway';
import { CertificateTemplate } from '../entities/certificate-template.entity';
import { FileStorageGateway } from '../../storage/gateways/file-storage.gateway';

/**
 * Tests para UploadCertificateTemplateUseCase tras el refactor a FileStorageGateway.
 *
 * Antes mockeábamos fs/promises y crypto porque el use case los importaba directo.
 * Ahora solo mockeamos:
 *   - pdf-lib (para no depender de un PDF real al leer dimensiones)
 *   - FileStorageGateway (la abstracción de almacenamiento)
 *   - CertificateTemplateGateway (la abstracción de persistencia)
 *
 * El use case quedó tan limpio que sus tests son puramente declarativos.
 */
jest.mock('pdf-lib', () => ({
  PDFDocument: {
    load: jest.fn(),
  },
}));

import { PDFDocument } from 'pdf-lib';
const pdfLoadMock = PDFDocument.load as jest.MockedFunction<
  typeof PDFDocument.load
>;

describe('UploadCertificateTemplateUseCase', () => {
  let useCase: UploadCertificateTemplateUseCase;
  let templateGateway: jest.Mocked<CertificateTemplateGateway>;
  let fileStorageGateway: jest.Mocked<FileStorageGateway>;

  const fakeFile = (originalname = 'plantilla.pdf') =>
    ({
      originalname,
      buffer: Buffer.from('fake-pdf-bytes'),
    }) as Express.Multer.File;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Por defecto el PDF tiene una página A4 horizontal (841 x 595 pts)
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
        {
          provide: FileStorageGateway,
          useValue: { saveFile: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(UploadCertificateTemplateUseCase);
    templateGateway = module.get(CertificateTemplateGateway);
    fileStorageGateway = module.get(FileStorageGateway);

    // Default: el storage retorna una URL pública previsible
    fileStorageGateway.saveFile.mockResolvedValue(
      '/static/certificates/templates/uuid-from-storage.pdf',
    );
  });

  it('persiste la plantilla con las dimensiones reales del PDF', async () => {
    const created = { id: 'tpl-1' } as CertificateTemplate;
    templateGateway.create.mockResolvedValue(created);

    await useCase.execute(
      {
        name: 'Manicure Básico',
        courseAbbreviation: 'MB',
        paperFormat: 'A4 Horizontal',
      },
      fakeFile(),
    );

    expect(templateGateway.create).toHaveBeenCalledWith(
      expect.objectContaining({
        pageWidth: 841,
        pageHeight: 595,
      }),
    );
  });

  it('convierte courseAbbreviation a mayúsculas antes de persistir', async () => {
    templateGateway.create.mockResolvedValue({} as CertificateTemplate);

    await useCase.execute(
      { name: 'Básico', courseAbbreviation: 'mb', paperFormat: 'A4 Vertical' },
      fakeFile(),
    );

    expect(templateGateway.create).toHaveBeenCalledWith(
      expect.objectContaining({ courseAbbreviation: 'MB' }),
    );
  });

  it('delega el guardado del archivo al FileStorageGateway en la subcarpeta certificates/templates', async () => {
    templateGateway.create.mockResolvedValue({} as CertificateTemplate);
    const file = fakeFile();

    await useCase.execute(
      {
        name: 'Test',
        courseAbbreviation: 'T',
        paperFormat: 'A4 Vertical',
      },
      file,
    );

    expect(fileStorageGateway.saveFile).toHaveBeenCalledWith(
      file,
      'certificates/templates',
    );
  });

  it('persiste el filePath devuelto por el storage gateway (no construye URLs por su cuenta)', async () => {
    fileStorageGateway.saveFile.mockResolvedValue(
      '/static/certificates/templates/abc-123.pdf',
    );
    templateGateway.create.mockResolvedValue({} as CertificateTemplate);

    await useCase.execute(
      { name: 'Test', courseAbbreviation: 'T', paperFormat: 'A4 Vertical' },
      fakeFile(),
    );

    expect(templateGateway.create).toHaveBeenCalledWith(
      expect.objectContaining({
        filePath: '/static/certificates/templates/abc-123.pdf',
      }),
    );
  });

  it('lee las dimensiones de la PRIMERA página (ignora el resto en PDFs multipágina)', async () => {
    pdfLoadMock.mockResolvedValue({
      getPages: () => [
        { getSize: () => ({ width: 595, height: 842 }) }, // primera página: A4 portrait
        { getSize: () => ({ width: 1000, height: 2000 }) }, // segunda
        { getSize: () => ({ width: 500, height: 700 }) }, // tercera
      ],
    } as unknown as any);

    templateGateway.create.mockResolvedValue({} as CertificateTemplate);

    await useCase.execute(
      { name: 'Multi', courseAbbreviation: 'M', paperFormat: 'A4 Vertical' },
      fakeFile(),
    );

    expect(templateGateway.create).toHaveBeenCalledWith(
      expect.objectContaining({ pageWidth: 595, pageHeight: 842 }),
    );
  });

  it('NO escribe nada al storage si pdf-lib falla al leer las dimensiones (atómico)', async () => {
    pdfLoadMock.mockRejectedValue(new Error('PDF corrupto'));
    templateGateway.create.mockResolvedValue({} as CertificateTemplate);

    await expect(
      useCase.execute(
        { name: 'Test', courseAbbreviation: 'T', paperFormat: 'A4 Vertical' },
        fakeFile(),
      ),
    ).rejects.toThrow('PDF corrupto');

    expect(fileStorageGateway.saveFile).not.toHaveBeenCalled();
    expect(templateGateway.create).not.toHaveBeenCalled();
  });
});

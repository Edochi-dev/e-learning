import { Test } from '@nestjs/testing';
import { PayloadTooLargeException } from '@nestjs/common';
import { UploadCertificateTemplateUseCase } from './upload-certificate-template.use-case';
import { CertificateTemplateGateway } from '../gateways/certificate-template.gateway';
import { CertificateTemplate } from '../entities/certificate-template.entity';
import { FileStorageGateway } from '../../storage/gateways/file-storage.gateway';
import { TemplateFilePreparer } from '../services/template-file-preparer';

/**
 * El use case orquesta: preparar el PDF (validación, optimización, regla de
 * peso y dimensiones), guardarlo y persistir la plantilla. Se mockean las tres
 * colaboraciones; TemplateFilePreparer tiene sus propios tests.
 */
describe('UploadCertificateTemplateUseCase', () => {
  let useCase: UploadCertificateTemplateUseCase;
  let templateGateway: jest.Mocked<CertificateTemplateGateway>;
  let fileStorageGateway: jest.Mocked<FileStorageGateway>;
  let preparer: jest.Mocked<TemplateFilePreparer>;

  const fakeFile = (originalname = 'plantilla.pdf') =>
    ({
      originalname,
      buffer: Buffer.from('fake-pdf-bytes'),
    }) as Express.Multer.File;

  const preparedFile = {
    originalname: 'plantilla.pdf',
    buffer: Buffer.from('optimized-pdf-bytes'),
  } as Express.Multer.File;

  const dto = {
    name: 'Manicure Básico',
    courseAbbreviation: 'MB',
    paperFormat: 'A4 Horizontal',
  };

  beforeEach(async () => {
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
        {
          provide: TemplateFilePreparer,
          useValue: { prepare: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(UploadCertificateTemplateUseCase);
    templateGateway = module.get(CertificateTemplateGateway);
    fileStorageGateway = module.get(FileStorageGateway);
    preparer = module.get(TemplateFilePreparer);

    preparer.prepare.mockResolvedValue({
      file: preparedFile,
      pageWidth: 841,
      pageHeight: 595,
    });
    fileStorageGateway.saveFile.mockResolvedValue(
      '/static/certificates/templates/uuid-from-storage.pdf',
    );
    templateGateway.create.mockResolvedValue({} as CertificateTemplate);
  });

  it('persiste la plantilla con las dimensiones que lee el preparador', async () => {
    await useCase.execute(dto, fakeFile());

    expect(templateGateway.create).toHaveBeenCalledWith(
      expect.objectContaining({ pageWidth: 841, pageHeight: 595 }),
    );
  });

  it('convierte courseAbbreviation a mayúsculas antes de persistir', async () => {
    await useCase.execute({ ...dto, courseAbbreviation: 'mb' }, fakeFile());

    expect(templateGateway.create).toHaveBeenCalledWith(
      expect.objectContaining({ courseAbbreviation: 'MB' }),
    );
  });

  it('guarda el PDF preparado (optimizado), no el subido, en certificates/templates', async () => {
    const file = fakeFile();

    await useCase.execute(dto, file);

    expect(preparer.prepare).toHaveBeenCalledWith(file);
    expect(fileStorageGateway.saveFile).toHaveBeenCalledWith(
      preparedFile,
      'certificates/templates',
    );
  });

  it('persiste el filePath devuelto por el storage gateway (no construye URLs por su cuenta)', async () => {
    fileStorageGateway.saveFile.mockResolvedValue(
      '/static/certificates/templates/abc-123.pdf',
    );

    await useCase.execute(dto, fakeFile());

    expect(templateGateway.create).toHaveBeenCalledWith(
      expect.objectContaining({
        filePath: '/static/certificates/templates/abc-123.pdf',
      }),
    );
  });

  it.each([
    ['PDF corrupto', new Error('PDF corrupto')],
    ['plantilla demasiado pesada', new PayloadTooLargeException('pesa 4,6 MB')],
  ])(
    'NO escribe nada si el preparador rechaza el PDF (%s)',
    async (_, error) => {
      preparer.prepare.mockRejectedValue(error);

      await expect(useCase.execute(dto, fakeFile())).rejects.toBe(error);

      expect(fileStorageGateway.saveFile).not.toHaveBeenCalled();
      expect(templateGateway.create).not.toHaveBeenCalled();
    },
  );
});

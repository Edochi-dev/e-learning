import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { EditCertificateTemplateUseCase } from './edit-certificate-template.use-case';
import { CertificateTemplateGateway } from '../gateways/certificate-template.gateway';
import { FileStorageGateway } from '../../storage/gateways/file-storage.gateway';
import { CertificateTemplate } from '../entities/certificate-template.entity';
import {
  DEFAULT_NAME_STYLE,
  DEFAULT_QR_STYLE,
  DEFAULT_DATE_STYLE,
} from '../value-objects';

/**
 * Tests para EditCertificateTemplateUseCase.
 *
 * Cubrimos los caminos críticos:
 *   - Validación de existencia (NotFoundException)
 *   - Edición parcial de metadata (PATCH semántico estricto)
 *   - Reemplazo de PDF con dimensiones idénticas (preserva styles)
 *   - Reemplazo de PDF con dimensiones distintas (resetea styles a defaults)
 *   - Orden de operaciones: BD se actualiza ANTES de borrar el archivo viejo
 *   - Resiliencia: si borrar el viejo falla, la operación NO falla
 *   - Atomicidad: si pdf-lib falla, NO se llama a saveFile ni a update
 */
jest.mock('pdf-lib', () => ({
  PDFDocument: { load: jest.fn() },
}));

import { PDFDocument } from 'pdf-lib';
const pdfLoadMock = PDFDocument.load as jest.MockedFunction<
  typeof PDFDocument.load
>;

describe('EditCertificateTemplateUseCase', () => {
  let useCase: EditCertificateTemplateUseCase;
  let templateGateway: jest.Mocked<CertificateTemplateGateway>;
  let fileStorageGateway: jest.Mocked<FileStorageGateway>;

  const fakeFile = () =>
    ({
      originalname: 'nuevo.pdf',
      buffer: Buffer.from('fake-pdf-bytes'),
    }) as Express.Multer.File;

  const existingTemplate: CertificateTemplate = {
    id: 'tpl-1',
    name: 'Manicure Básico',
    courseAbbreviation: 'MB',
    filePath: '/static/certificates/templates/old.pdf',
    pageWidth: 841,
    pageHeight: 595,
    paperFormat: 'A4 Horizontal',
    nameStyle: {
      positionX: 100,
      positionY: 200,
      fontSize: 32,
      color: '#ff0000',
      fontFamily: 'PlayfairDisplay-Regular',
      align: 'center',
    },
    qrStyle: { positionX: 50, positionY: 60, size: 90 },
    dateStyle: {
      show: true,
      positionX: 100,
      positionY: 400,
      fontSize: 18,
      color: '#000000',
      fontFamily: 'Helvetica',
      align: 'left',
    },
    createdAt: new Date(),
    certificates: [],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Default: el PDF nuevo tiene las MISMAS dimensiones que el existente
    pdfLoadMock.mockResolvedValue({
      getPages: () => [{ getSize: () => ({ width: 841, height: 595 }) }],
    } as unknown as any);

    const module = await Test.createTestingModule({
      providers: [
        EditCertificateTemplateUseCase,
        {
          provide: CertificateTemplateGateway,
          useValue: { findOne: jest.fn(), update: jest.fn() },
        },
        {
          provide: FileStorageGateway,
          useValue: { saveFile: jest.fn(), deleteByUrl: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(EditCertificateTemplateUseCase);
    templateGateway = module.get(CertificateTemplateGateway);
    fileStorageGateway = module.get(FileStorageGateway);

    fileStorageGateway.saveFile.mockResolvedValue(
      '/static/certificates/templates/new.pdf',
    );
    fileStorageGateway.deleteByUrl.mockResolvedValue(undefined);
    templateGateway.update.mockImplementation(
      async (_id, data) =>
        ({ ...existingTemplate, ...data }) as CertificateTemplate,
    );
  });

  it('lanza NotFoundException si la plantilla no existe', async () => {
    templateGateway.findOne.mockResolvedValue(null);

    await expect(
      useCase.execute('tpl-inexistente', { name: 'Nuevo' }),
    ).rejects.toThrow(NotFoundException);

    expect(templateGateway.update).not.toHaveBeenCalled();
    expect(fileStorageGateway.saveFile).not.toHaveBeenCalled();
  });

  it('actualiza solo los campos presentes en el DTO (PATCH semántico estricto)', async () => {
    templateGateway.findOne.mockResolvedValue(existingTemplate);

    await useCase.execute('tpl-1', { name: 'Manicure Pro' });

    expect(templateGateway.update).toHaveBeenCalledWith('tpl-1', {
      name: 'Manicure Pro',
    });
  });

  it('convierte courseAbbreviation a mayúsculas antes de persistir', async () => {
    templateGateway.findOne.mockResolvedValue(existingTemplate);

    await useCase.execute('tpl-1', { courseAbbreviation: 'mp' });

    expect(templateGateway.update).toHaveBeenCalledWith('tpl-1', {
      courseAbbreviation: 'MP',
    });
  });

  it('NO toca el filesystem si solo se editan metadatos (sin file)', async () => {
    templateGateway.findOne.mockResolvedValue(existingTemplate);

    await useCase.execute('tpl-1', { name: 'Otro' });

    expect(fileStorageGateway.saveFile).not.toHaveBeenCalled();
    expect(fileStorageGateway.deleteByUrl).not.toHaveBeenCalled();
  });

  it('reemplaza el PDF y persiste el nuevo filePath + nuevas dimensiones', async () => {
    templateGateway.findOne.mockResolvedValue(existingTemplate);
    pdfLoadMock.mockResolvedValue({
      getPages: () => [{ getSize: () => ({ width: 841, height: 595 }) }],
    } as unknown as any);

    await useCase.execute('tpl-1', {}, fakeFile());

    expect(fileStorageGateway.saveFile).toHaveBeenCalledWith(
      expect.any(Object),
      'certificates/templates',
    );
    expect(templateGateway.update).toHaveBeenCalledWith(
      'tpl-1',
      expect.objectContaining({
        filePath: '/static/certificates/templates/new.pdf',
        pageWidth: 841,
        pageHeight: 595,
      }),
    );
  });

  it('preserva los styles cuando el PDF nuevo tiene EXACTAMENTE las mismas dimensiones', async () => {
    templateGateway.findOne.mockResolvedValue(existingTemplate);
    // dimensiones idénticas (default del beforeEach)

    await useCase.execute('tpl-1', {}, fakeFile());

    const updateCall = templateGateway.update.mock.calls[0][1];
    expect(updateCall.nameStyle).toBeUndefined();
    expect(updateCall.qrStyle).toBeUndefined();
    expect(updateCall.dateStyle).toBeUndefined();
  });

  it('RESETEA los styles a defaults cuando las dimensiones del PDF cambian', async () => {
    templateGateway.findOne.mockResolvedValue(existingTemplate);
    pdfLoadMock.mockResolvedValue({
      getPages: () => [{ getSize: () => ({ width: 595, height: 842 }) }], // A4 vertical
    } as unknown as any);

    await useCase.execute('tpl-1', {}, fakeFile());

    expect(templateGateway.update).toHaveBeenCalledWith(
      'tpl-1',
      expect.objectContaining({
        nameStyle: DEFAULT_NAME_STYLE,
        qrStyle: DEFAULT_QR_STYLE,
        dateStyle: DEFAULT_DATE_STYLE,
      }),
    );
  });

  it('borra el PDF viejo SOLO DESPUÉS de actualizar la BD (orden importa para atomicidad)', async () => {
    templateGateway.findOne.mockResolvedValue(existingTemplate);
    const callOrder: string[] = [];
    templateGateway.update.mockImplementation(async () => {
      callOrder.push('update');
      return existingTemplate;
    });
    fileStorageGateway.deleteByUrl.mockImplementation(async () => {
      callOrder.push('deleteByUrl');
    });

    await useCase.execute('tpl-1', {}, fakeFile());

    expect(callOrder).toEqual(['update', 'deleteByUrl']);
    expect(fileStorageGateway.deleteByUrl).toHaveBeenCalledWith(
      '/static/certificates/templates/old.pdf',
    );
  });

  it('NO falla la operación si el borrado del PDF viejo lanza error (resiliencia)', async () => {
    templateGateway.findOne.mockResolvedValue(existingTemplate);
    fileStorageGateway.deleteByUrl.mockRejectedValue(
      new Error('EACCES: permission denied'),
    );

    const result = await useCase.execute('tpl-1', {}, fakeFile());

    expect(result).toBeDefined();
    expect(templateGateway.update).toHaveBeenCalled();
  });

  it('NO escribe nada al storage si pdf-lib falla al leer dimensiones (atomicidad)', async () => {
    templateGateway.findOne.mockResolvedValue(existingTemplate);
    pdfLoadMock.mockRejectedValue(new Error('PDF corrupto'));

    await expect(
      useCase.execute('tpl-1', {}, fakeFile()),
    ).rejects.toThrow('PDF corrupto');

    expect(fileStorageGateway.saveFile).not.toHaveBeenCalled();
    expect(templateGateway.update).not.toHaveBeenCalled();
    expect(fileStorageGateway.deleteByUrl).not.toHaveBeenCalled();
  });

  it('combina edición de metadatos + reemplazo de PDF en una sola operación', async () => {
    templateGateway.findOne.mockResolvedValue(existingTemplate);

    await useCase.execute(
      'tpl-1',
      { name: 'Manicure Pro 2025', courseAbbreviation: 'mp25' },
      fakeFile(),
    );

    expect(templateGateway.update).toHaveBeenCalledWith(
      'tpl-1',
      expect.objectContaining({
        name: 'Manicure Pro 2025',
        courseAbbreviation: 'MP25',
        filePath: '/static/certificates/templates/new.pdf',
      }),
    );
  });
});

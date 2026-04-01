import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DeleteCertificateTemplateUseCase } from './delete-certificate-template.use-case';
import { CertificateTemplateGateway } from '../gateways/certificate-template.gateway';
import { CertificateGateway } from '../gateways/certificate.gateway';
import { FileStorageGateway } from '../../storage/gateways/file-storage.gateway';
import { CertificateTemplate } from '../entities/certificate-template.entity';
import { Certificate } from '../entities/certificate.entity';

/**
 * Tests para DeleteCertificateTemplateUseCase — eliminación de plantilla.
 *
 * Después del refactor:
 *   - Ya no mockea fs/promises directamente
 *   - Usa FileStorageGateway.deleteByUrl para toda gestión de archivos
 *   - Las verificaciones usan deleteByUrl en lugar de contar llamadas a unlink
 */
describe('DeleteCertificateTemplateUseCase', () => {
  let useCase: DeleteCertificateTemplateUseCase;
  let templateGateway: jest.Mocked<CertificateTemplateGateway>;
  let certGateway: jest.Mocked<CertificateGateway>;
  let fileStorageGateway: jest.Mocked<FileStorageGateway>;

  const fakeTemplate = {
    id: 'tpl-1',
    filePath: '/static/certificates/templates/tpl-1.pdf',
  } as CertificateTemplate;

  const fakeCerts = [
    { id: 'c1', filePath: '/static/certificates/generated/c1.pdf' },
    { id: 'c2', filePath: '/static/certificates/generated/c2.pdf' },
  ] as Certificate[];

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        DeleteCertificateTemplateUseCase,
        {
          provide: CertificateTemplateGateway,
          useValue: { findOne: jest.fn(), delete: jest.fn() },
        },
        {
          provide: CertificateGateway,
          useValue: {
            deleteAllByTemplateId: jest.fn(),
            unlinkAllFromTemplate: jest.fn(),
          },
        },
        {
          provide: FileStorageGateway,
          useValue: { deleteByUrl: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(DeleteCertificateTemplateUseCase);
    templateGateway = module.get(CertificateTemplateGateway);
    certGateway = module.get(CertificateGateway);
    fileStorageGateway = module.get(FileStorageGateway);
  });

  it('lanza NotFoundException si la plantilla no existe', async () => {
    templateGateway.findOne.mockResolvedValue(null);

    await expect(useCase.execute('id-inexistente')).rejects.toThrow(
      NotFoundException,
    );
    expect(templateGateway.delete).not.toHaveBeenCalled();
  });

  describe("certAction = 'keep' (comportamiento por defecto)", () => {
    it('desconecta los certificados de la plantilla sin borrar sus archivos', async () => {
      templateGateway.findOne.mockResolvedValue(fakeTemplate);
      certGateway.unlinkAllFromTemplate.mockResolvedValue(undefined);
      templateGateway.delete.mockResolvedValue(undefined);

      await useCase.execute('tpl-1'); // 'keep' es el default

      expect(certGateway.unlinkAllFromTemplate).toHaveBeenCalledWith('tpl-1');
      expect(certGateway.deleteAllByTemplateId).not.toHaveBeenCalled();
    });

    it('borra solo el archivo PDF de la plantilla via deleteByUrl', async () => {
      templateGateway.findOne.mockResolvedValue(fakeTemplate);
      certGateway.unlinkAllFromTemplate.mockResolvedValue(undefined);
      templateGateway.delete.mockResolvedValue(undefined);

      await useCase.execute('tpl-1', 'keep');

      // Solo 1 llamada a deleteByUrl: la plantilla (no los certificados)
      expect(fileStorageGateway.deleteByUrl).toHaveBeenCalledTimes(1);
      expect(fileStorageGateway.deleteByUrl).toHaveBeenCalledWith(
        '/static/certificates/templates/tpl-1.pdf',
      );
      expect(templateGateway.delete).toHaveBeenCalledWith('tpl-1');
    });
  });

  describe("certAction = 'delete'", () => {
    it('borra todos los PDFs de los certificados asociados y luego la plantilla', async () => {
      templateGateway.findOne.mockResolvedValue(fakeTemplate);
      certGateway.deleteAllByTemplateId.mockResolvedValue(fakeCerts);
      templateGateway.delete.mockResolvedValue(undefined);

      await useCase.execute('tpl-1', 'delete');

      expect(certGateway.deleteAllByTemplateId).toHaveBeenCalledWith('tpl-1');
      // 2 PDFs de los certs + 1 PDF de la plantilla = 3 llamadas a deleteByUrl
      expect(fileStorageGateway.deleteByUrl).toHaveBeenCalledTimes(3);
      expect(fileStorageGateway.deleteByUrl).toHaveBeenCalledWith(
        '/static/certificates/generated/c1.pdf',
      );
      expect(fileStorageGateway.deleteByUrl).toHaveBeenCalledWith(
        '/static/certificates/generated/c2.pdf',
      );
      expect(fileStorageGateway.deleteByUrl).toHaveBeenCalledWith(
        '/static/certificates/templates/tpl-1.pdf',
      );
      expect(templateGateway.delete).toHaveBeenCalledWith('tpl-1');
    });

    it('no llama a unlinkAllFromTemplate cuando la acción es delete', async () => {
      templateGateway.findOne.mockResolvedValue(fakeTemplate);
      certGateway.deleteAllByTemplateId.mockResolvedValue([]);
      templateGateway.delete.mockResolvedValue(undefined);

      await useCase.execute('tpl-1', 'delete');

      expect(certGateway.unlinkAllFromTemplate).not.toHaveBeenCalled();
    });
  });
});

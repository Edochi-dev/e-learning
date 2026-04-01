import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DeleteCertificateUseCase } from './delete-certificate.use-case';
import { CertificateGateway } from '../gateways/certificate.gateway';
import { FileStorageGateway } from '../../storage/gateways/file-storage.gateway';
import { Certificate } from '../entities/certificate.entity';

/**
 * Tests para DeleteCertificateUseCase — eliminación de certificado y su PDF.
 *
 * Después del refactor:
 *   - Ya no mockea fs/promises directamente
 *   - Usa FileStorageGateway.deleteByUrl (la abstracción correcta)
 *   - El Use Case no sabe nada del filesystem
 */
describe('DeleteCertificateUseCase', () => {
  let useCase: DeleteCertificateUseCase;
  let gateway: jest.Mocked<CertificateGateway>;
  let fileStorageGateway: jest.Mocked<FileStorageGateway>;

  const fakeCert = {
    id: 'cert-uuid',
    filePath: '/static/certificates/generated/cert-uuid.pdf',
  } as Certificate;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        DeleteCertificateUseCase,
        {
          provide: CertificateGateway,
          useValue: { findOne: jest.fn(), delete: jest.fn() },
        },
        {
          provide: FileStorageGateway,
          useValue: { deleteByUrl: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(DeleteCertificateUseCase);
    gateway = module.get(CertificateGateway);
    fileStorageGateway = module.get(FileStorageGateway);
  });

  it('lanza NotFoundException si el certificado no existe en BD', async () => {
    gateway.findOne.mockResolvedValue(null);

    await expect(useCase.execute('id-inexistente')).rejects.toThrow(
      NotFoundException,
    );
    expect(gateway.delete).not.toHaveBeenCalled();
  });

  it('llama a deleteByUrl con el filePath y luego elimina el registro de la BD', async () => {
    gateway.findOne.mockResolvedValue(fakeCert);
    gateway.delete.mockResolvedValue(undefined);

    await useCase.execute('cert-uuid');

    // Verifica que deleteByUrl recibe la URL completa del PDF
    expect(fileStorageGateway.deleteByUrl).toHaveBeenCalledWith(
      '/static/certificates/generated/cert-uuid.pdf',
    );
    // Verifica que eliminó el registro de la BD
    expect(gateway.delete).toHaveBeenCalledWith('cert-uuid');
  });
});

import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DeleteCertificateUseCase } from './delete-certificate.use-case';
import { CertificateGateway } from '../gateways/certificate.gateway';
import { Certificate } from '../entities/certificate.entity';

// Mockeamos el módulo fs/promises completo para aislar los tests del filesystem real
jest.mock('fs/promises', () => ({
  unlink: jest.fn(),
}));

import { unlink } from 'fs/promises';
const unlinkMock = unlink as jest.MockedFunction<typeof unlink>;

describe('DeleteCertificateUseCase', () => {
  let useCase: DeleteCertificateUseCase;
  let gateway: jest.Mocked<CertificateGateway>;

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
      ],
    }).compile();

    useCase = module.get(DeleteCertificateUseCase);
    gateway = module.get(CertificateGateway);
  });

  it('lanza NotFoundException si el certificado no existe en BD', async () => {
    gateway.findOne.mockResolvedValue(null);

    await expect(useCase.execute('id-inexistente')).rejects.toThrow(
      NotFoundException,
    );
    expect(gateway.delete).not.toHaveBeenCalled();
  });

  it('elimina el archivo del disco y el registro de la BD', async () => {
    gateway.findOne.mockResolvedValue(fakeCert);
    unlinkMock.mockResolvedValue(undefined);
    gateway.delete.mockResolvedValue(undefined);

    await useCase.execute('cert-uuid');

    // Verifica que se intentó borrar el archivo
    expect(unlinkMock).toHaveBeenCalledTimes(1);
    // Verifica que eliminó el registro de la BD
    expect(gateway.delete).toHaveBeenCalledWith('cert-uuid');
  });

  it('sigue eliminando el registro de la BD aunque el archivo ya no exista en disco (desincronización)', async () => {
    // Edge case importante en producción: el archivo fue borrado manualmente del servidor
    // pero el registro sigue en la BD. El .catch(() => {}) debe absorber el error.
    gateway.findOne.mockResolvedValue(fakeCert);
    unlinkMock.mockRejectedValue(
      new Error('ENOENT: no such file or directory'),
    );
    gateway.delete.mockResolvedValue(undefined);

    // No debe lanzar error
    await expect(useCase.execute('cert-uuid')).resolves.toBeUndefined();
    expect(gateway.delete).toHaveBeenCalledWith('cert-uuid');
  });
});

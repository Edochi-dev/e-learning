import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DeleteCertificateBatchUseCase } from './delete-certificate-batch.use-case';
import { CertificateGateway } from '../gateways/certificate.gateway';
import { FileStorageGateway } from '../../storage/gateways/file-storage.gateway';
import { Certificate } from '../entities/certificate.entity';

describe('DeleteCertificateBatchUseCase', () => {
  let useCase: DeleteCertificateBatchUseCase;
  let findByIds: jest.Mock;
  let deleteMany: jest.Mock;
  let deleteByUrl: jest.Mock;
  let calls: string[];

  const cert = (id: string) =>
    ({
      id,
      filePath: `/static/certificates/generated/${id}.pdf`,
    }) as Certificate;

  beforeEach(async () => {
    calls = [];
    findByIds = jest.fn();
    deleteMany = jest.fn().mockImplementation(() => {
      calls.push('deleteMany');
      return Promise.resolve();
    });
    deleteByUrl = jest.fn().mockImplementation(() => {
      calls.push('deleteByUrl');
      return Promise.resolve();
    });

    const module = await Test.createTestingModule({
      providers: [
        DeleteCertificateBatchUseCase,
        { provide: CertificateGateway, useValue: { findByIds, deleteMany } },
        { provide: FileStorageGateway, useValue: { deleteByUrl } },
      ],
    }).compile();

    useCase = module.get(DeleteCertificateBatchUseCase);
  });

  it('borra los registros y después los PDF de cada certificado', async () => {
    findByIds.mockResolvedValue([cert('a'), cert('b')]);

    await useCase.execute(['a', 'b']);

    expect(deleteMany).toHaveBeenCalledWith(['a', 'b']);
    expect(deleteByUrl).toHaveBeenCalledWith(
      '/static/certificates/generated/a.pdf',
    );
    expect(deleteByUrl).toHaveBeenCalledWith(
      '/static/certificates/generated/b.pdf',
    );
    expect(calls).toEqual(['deleteMany', 'deleteByUrl', 'deleteByUrl']);
  });

  it('NO borra nada si algún id no existe, y nombra los que faltan', async () => {
    findByIds.mockResolvedValue([cert('a')]);

    await expect(useCase.execute(['a', 'missing'])).rejects.toThrow(
      new NotFoundException('Certificados no encontrados: missing'),
    );
    expect(deleteMany).not.toHaveBeenCalled();
    expect(deleteByUrl).not.toHaveBeenCalled();
  });

  it('ignora ids repetidos en vez de darlos por inexistentes', async () => {
    findByIds.mockResolvedValue([cert('a')]);

    await useCase.execute(['a', 'a']);

    expect(findByIds).toHaveBeenCalledWith(['a']);
    expect(deleteMany).toHaveBeenCalledWith(['a']);
  });

  it('si falla el borrado en BD, no toca ningún archivo', async () => {
    findByIds.mockResolvedValue([cert('a')]);
    deleteMany.mockRejectedValue(new Error('db down'));

    await expect(useCase.execute(['a'])).rejects.toThrow('db down');
    expect(deleteByUrl).not.toHaveBeenCalled();
  });
});

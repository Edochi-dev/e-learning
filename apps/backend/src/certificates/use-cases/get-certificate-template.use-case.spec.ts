import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GetCertificateTemplateUseCase } from './get-certificate-template.use-case';
import { CertificateTemplateGateway } from '../gateways/certificate-template.gateway';
import { CertificateTemplate } from '../entities/certificate-template.entity';

describe('GetCertificateTemplateUseCase', () => {
  let useCase: GetCertificateTemplateUseCase;
  let gateway: jest.Mocked<CertificateTemplateGateway>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        GetCertificateTemplateUseCase,
        {
          provide: CertificateTemplateGateway,
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(GetCertificateTemplateUseCase);
    gateway = module.get(CertificateTemplateGateway);
  });

  it('retorna la plantilla cuando existe', async () => {
    const template = { id: 'tpl-1', name: 'Manicure' } as CertificateTemplate;
    gateway.findOne.mockResolvedValue(template);

    const result = await useCase.execute('tpl-1');

    expect(result).toBe(template);
    expect(gateway.findOne).toHaveBeenCalledWith('tpl-1');
  });

  it('lanza NotFoundException cuando la plantilla no existe', async () => {
    gateway.findOne.mockResolvedValue(null);

    await expect(useCase.execute('tpl-inexistente')).rejects.toThrow(
      NotFoundException,
    );
  });
});

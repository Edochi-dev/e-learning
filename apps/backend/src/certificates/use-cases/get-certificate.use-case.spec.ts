import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GetCertificateUseCase } from './get-certificate.use-case';
import { CertificateGateway } from '../gateways/certificate.gateway';
import { Certificate } from '../entities/certificate.entity';

describe('GetCertificateUseCase', () => {
    let useCase: GetCertificateUseCase;
    let gateway: jest.Mocked<CertificateGateway>;

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [
                GetCertificateUseCase,
                {
                    provide: CertificateGateway,
                    useValue: { findOne: jest.fn() },
                },
            ],
        }).compile();

        useCase = module.get(GetCertificateUseCase);
        gateway = module.get(CertificateGateway);
    });

    it('retorna el certificado cuando existe', async () => {
        const cert = { id: 'abc-123', recipientName: 'Ana García' } as Certificate;
        gateway.findOne.mockResolvedValue(cert);

        const result = await useCase.execute('abc-123');

        expect(result).toBe(cert);
        expect(gateway.findOne).toHaveBeenCalledWith('abc-123');
    });

    it('lanza NotFoundException cuando el certificado no existe', async () => {
        gateway.findOne.mockResolvedValue(null);

        await expect(useCase.execute('id-inexistente')).rejects.toThrow(NotFoundException);
    });
});

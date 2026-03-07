import { Test } from '@nestjs/testing';
import { ListCertificateTemplatesUseCase } from './list-certificate-templates.use-case';
import { CertificateTemplateGateway } from '../gateways/certificate-template.gateway';
import { CertificateGateway } from '../gateways/certificate.gateway';
import { CertificateTemplate } from '../entities/certificate-template.entity';

describe('ListCertificateTemplatesUseCase', () => {
    let useCase: ListCertificateTemplatesUseCase;
    let templateGateway: jest.Mocked<CertificateTemplateGateway>;
    let certGateway: jest.Mocked<CertificateGateway>;

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [
                ListCertificateTemplatesUseCase,
                {
                    provide: CertificateTemplateGateway,
                    useValue: { findAll: jest.fn() },
                },
                {
                    provide: CertificateGateway,
                    useValue: { countByTemplateId: jest.fn() },
                },
            ],
        }).compile();

        useCase = module.get(ListCertificateTemplatesUseCase);
        templateGateway = module.get(CertificateTemplateGateway);
        certGateway = module.get(CertificateGateway);
    });

    it('retorna un array vacío cuando no hay plantillas', async () => {
        templateGateway.findAll.mockResolvedValue([]);

        const result = await useCase.execute();

        expect(result).toEqual([]);
        expect(certGateway.countByTemplateId).not.toHaveBeenCalled();
    });

    it('agrega certificateCount a cada plantilla', async () => {
        const templates = [
            { id: 'tpl-1', name: 'Básico' },
            { id: 'tpl-2', name: 'Avanzado' },
        ] as CertificateTemplate[];

        templateGateway.findAll.mockResolvedValue(templates);
        certGateway.countByTemplateId.mockResolvedValueOnce(3).mockResolvedValueOnce(0);

        const result = await useCase.execute();

        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({ id: 'tpl-1', certificateCount: 3 });
        expect(result[1]).toMatchObject({ id: 'tpl-2', certificateCount: 0 });
    });

    it('consulta el conteo para cada plantilla exactamente una vez', async () => {
        const templates = [
            { id: 'tpl-A' },
            { id: 'tpl-B' },
            { id: 'tpl-C' },
        ] as CertificateTemplate[];

        templateGateway.findAll.mockResolvedValue(templates);
        certGateway.countByTemplateId.mockResolvedValue(0);

        await useCase.execute();

        expect(certGateway.countByTemplateId).toHaveBeenCalledTimes(3);
        expect(certGateway.countByTemplateId).toHaveBeenCalledWith('tpl-A');
        expect(certGateway.countByTemplateId).toHaveBeenCalledWith('tpl-B');
        expect(certGateway.countByTemplateId).toHaveBeenCalledWith('tpl-C');
    });
});

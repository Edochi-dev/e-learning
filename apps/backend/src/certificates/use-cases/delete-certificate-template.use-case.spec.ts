import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DeleteCertificateTemplateUseCase } from './delete-certificate-template.use-case';
import { CertificateTemplateGateway } from '../gateways/certificate-template.gateway';
import { CertificateGateway } from '../gateways/certificate.gateway';
import { CertificateTemplate } from '../entities/certificate-template.entity';
import { Certificate } from '../entities/certificate.entity';

jest.mock('fs/promises', () => ({
    unlink: jest.fn(),
}));

import { unlink } from 'fs/promises';
const unlinkMock = unlink as jest.MockedFunction<typeof unlink>;

describe('DeleteCertificateTemplateUseCase', () => {
    let useCase: DeleteCertificateTemplateUseCase;
    let templateGateway: jest.Mocked<CertificateTemplateGateway>;
    let certGateway: jest.Mocked<CertificateGateway>;

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
        unlinkMock.mockResolvedValue(undefined);

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
            ],
        }).compile();

        useCase = module.get(DeleteCertificateTemplateUseCase);
        templateGateway = module.get(CertificateTemplateGateway);
        certGateway = module.get(CertificateGateway);
    });

    it('lanza NotFoundException si la plantilla no existe', async () => {
        templateGateway.findOne.mockResolvedValue(null);

        await expect(useCase.execute('id-inexistente')).rejects.toThrow(NotFoundException);
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

        it('borra el archivo PDF de la plantilla del disco', async () => {
            templateGateway.findOne.mockResolvedValue(fakeTemplate);
            certGateway.unlinkAllFromTemplate.mockResolvedValue(undefined);
            templateGateway.delete.mockResolvedValue(undefined);

            await useCase.execute('tpl-1', 'keep');

            // El unlink se llama solo para la plantilla, no para los certificados
            expect(unlinkMock).toHaveBeenCalledTimes(1);
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
            // 2 PDFs de los certs + 1 PDF de la plantilla = 3 llamadas a unlink
            expect(unlinkMock).toHaveBeenCalledTimes(3);
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

    it('sigue eliminando el registro de la BD aunque el archivo de la plantilla no exista en disco', async () => {
        templateGateway.findOne.mockResolvedValue(fakeTemplate);
        certGateway.unlinkAllFromTemplate.mockResolvedValue(undefined);
        unlinkMock.mockRejectedValue(new Error('ENOENT: no such file'));
        templateGateway.delete.mockResolvedValue(undefined);

        await expect(useCase.execute('tpl-1', 'keep')).resolves.toBeUndefined();
        expect(templateGateway.delete).toHaveBeenCalledWith('tpl-1');
    });
});

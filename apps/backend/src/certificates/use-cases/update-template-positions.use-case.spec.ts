import { Test } from '@nestjs/testing';
import { UpdateTemplatePositionsUseCase } from './update-template-positions.use-case';
import { CertificateTemplateGateway } from '../gateways/certificate-template.gateway';
import { CertificateTemplate } from '../entities/certificate-template.entity';
import { UpdateTemplatePositionsDto } from '../dto/update-template-positions.dto';

describe('UpdateTemplatePositionsUseCase', () => {
    let useCase: UpdateTemplatePositionsUseCase;
    let gateway: jest.Mocked<CertificateTemplateGateway>;

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [
                UpdateTemplatePositionsUseCase,
                {
                    provide: CertificateTemplateGateway,
                    useValue: { update: jest.fn() },
                },
            ],
        }).compile();

        useCase = module.get(UpdateTemplatePositionsUseCase);
        gateway = module.get(CertificateTemplateGateway);
    });

    it('delega todos los campos del DTO al gateway correctamente', async () => {
        const dto: UpdateTemplatePositionsDto = {
            namePositionX: 100,
            namePositionY: 200,
            nameFontSize: 32,
            nameColor: '#ff0000',
            fontFamily: 'PlayfairDisplay-Regular',
            qrPositionX: 50,
            qrPositionY: 60,
            qrSize: 90,
        };
        const updated = { id: 'tpl-1', ...dto } as unknown as CertificateTemplate;
        gateway.update.mockResolvedValue(updated);

        const result = await useCase.execute('tpl-1', dto);

        expect(gateway.update).toHaveBeenCalledWith('tpl-1', {
            namePositionX: 100,
            namePositionY: 200,
            nameFontSize: 32,
            nameColor: '#ff0000',
            fontFamily: 'PlayfairDisplay-Regular',
            qrPositionX: 50,
            qrPositionY: 60,
            qrSize: 90,
        });
        expect(result).toBe(updated);
    });
});

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

  it('delega los value objects del DTO al gateway correctamente', async () => {
    const dto: UpdateTemplatePositionsDto = {
      nameStyle: {
        positionX: 100,
        positionY: 200,
        fontSize: 32,
        color: '#ff0000',
        fontFamily: 'PlayfairDisplay-Regular',
        align: 'center',
      },
      qrStyle: {
        positionX: 50,
        positionY: 60,
        size: 90,
      },
      dateStyle: {
        show: true,
        positionX: 100,
        positionY: 400,
        fontSize: 18,
        color: '#000000',
        fontFamily: 'Helvetica',
        align: 'left',
      },
    };
    const updated = { id: 'tpl-1', ...dto } as unknown as CertificateTemplate;
    gateway.update.mockResolvedValue(updated);

    const result = await useCase.execute('tpl-1', dto);

    expect(gateway.update).toHaveBeenCalledWith('tpl-1', {
      nameStyle: dto.nameStyle,
      qrStyle: dto.qrStyle,
      dateStyle: dto.dateStyle,
    });
    expect(result).toBe(updated);
  });
});

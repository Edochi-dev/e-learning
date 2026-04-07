import { Test } from '@nestjs/testing';
import { UpdateTemplateDesignUseCase } from './update-template-design.use-case';
import { CertificateTemplateGateway } from '../gateways/certificate-template.gateway';
import { CertificateTemplate } from '../entities/certificate-template.entity';
import { UpdateTemplateDesignDto } from '../dto/update-template-design.dto';

describe('UpdateTemplateDesignUseCase', () => {
  let useCase: UpdateTemplateDesignUseCase;
  let gateway: jest.Mocked<CertificateTemplateGateway>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UpdateTemplateDesignUseCase,
        {
          provide: CertificateTemplateGateway,
          useValue: { update: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(UpdateTemplateDesignUseCase);
    gateway = module.get(CertificateTemplateGateway);
  });

  it('delega los value objects del DTO al gateway correctamente', async () => {
    const dto: UpdateTemplateDesignDto = {
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

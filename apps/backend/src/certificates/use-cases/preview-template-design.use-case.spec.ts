import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PreviewTemplateDesignUseCase } from './preview-template-design.use-case';
import { CertificateTemplateGateway } from '../gateways/certificate-template.gateway';
import { CertificateGeneratorGateway } from '../gateways/certificate-generator.gateway';
import { QrCodeGateway } from '../gateways/qr-code.gateway';
import { FileStorageGateway } from '../../storage/gateways/file-storage.gateway';
import { CertificateRenderer } from '../services/certificate-renderer';
import { CertificateTemplate } from '../entities/certificate-template.entity';
import { PreviewTemplateDesignDto } from '../dto/preview-template-design.dto';

describe('PreviewTemplateDesignUseCase', () => {
  let useCase: PreviewTemplateDesignUseCase;
  let templateGateway: jest.Mocked<CertificateTemplateGateway>;
  const update = jest.fn();
  const saveBuffer = jest.fn();
  const generate = jest.fn<
    ReturnType<CertificateGeneratorGateway['generate']>,
    Parameters<CertificateGeneratorGateway['generate']>
  >();
  const qrGenerate = jest.fn<
    ReturnType<QrCodeGateway['generate']>,
    Parameters<QrCodeGateway['generate']>
  >();

  // El diseño GUARDADO: la vista previa no debe usarlo.
  const stored = {
    id: 'tpl-1',
    filePath: '/static/certificates/templates/tpl-1.pdf',
    nameStyle: {
      positionX: 1,
      positionY: 1,
      fontSize: 10,
      color: '#000000',
      fontFamily: 'Helvetica',
      align: 'left',
    },
    qrStyle: {
      positionX: 1,
      positionY: 1,
      size: 50,
      foregroundColor: '#000000',
      backgroundColor: '#ffffff',
    },
    dateStyle: {
      positionX: 1,
      positionY: 1,
      fontSize: 10,
      color: '#000000',
      fontFamily: 'Helvetica',
      align: 'left',
    },
  } as CertificateTemplate;

  const dto = {
    nameStyle: {
      positionX: 300,
      positionY: 240,
      fontSize: 36,
      color: '#ffffff',
      fontFamily: 'GreatVibes-Regular',
      align: 'center',
    },
    qrStyle: { positionX: 464, positionY: 606, size: 90 },
    dateStyle: {
      positionX: 297,
      positionY: 463,
      fontSize: 18,
      color: '#1a1a1a',
      fontFamily: 'Helvetica',
      align: 'left',
    },
    sampleName: '  María Fernanda Castillo  ',
    sampleDate: '2026-10-20',
  } as PreviewTemplateDesignDto;

  beforeEach(async () => {
    jest.clearAllMocks();
    generate.mockResolvedValue(Buffer.from('pdf'));
    qrGenerate.mockResolvedValue(Buffer.from('qr'));
    const module = await Test.createTestingModule({
      providers: [
        PreviewTemplateDesignUseCase,
        CertificateRenderer,
        {
          provide: CertificateTemplateGateway,
          useValue: { findOne: jest.fn(), update },
        },
        {
          provide: CertificateGeneratorGateway,
          useValue: { generate },
        },
        {
          provide: QrCodeGateway,
          useValue: { generate: qrGenerate },
        },
        {
          provide: FileStorageGateway,
          useValue: {
            readFileByUrl: jest.fn().mockResolvedValue(Buffer.from('tpl')),
            saveBuffer: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('https://marisnails.academy'),
          },
        },
      ],
    }).compile();
    useCase = module.get(PreviewTemplateDesignUseCase);
    templateGateway = module.get(CertificateTemplateGateway);
  });

  it('dibuja con el diseño enviado (no el guardado), el nombre y la fecha de muestra', async () => {
    templateGateway.findOne.mockResolvedValue(stored);

    await expect(useCase.execute('tpl-1', dto)).resolves.toEqual(
      Buffer.from('pdf'),
    );

    const params = generate.mock.calls[0][0];
    expect(params.templatePath).toEqual(Buffer.from('tpl'));
    expect(params.recipientName).toBe('María Fernanda Castillo');
    expect(params.namePosition).toEqual({ x: 300, y: 240 });
    expect(params.nameAlign).toBe('center');
    expect(params.qrPosition).toEqual({ x: 464, y: 606 });
    expect(params.date.text).toBe('20/10/2026');
    // Colores del QR ausentes → los mismos por defecto que al guardar.
    expect(qrGenerate.mock.calls[0][2]).toEqual({
      foregroundColor: '#000000',
      backgroundColor: '#ffffff',
    });
  });

  it('no guarda nada: ni el diseño ni un archivo', async () => {
    templateGateway.findOne.mockResolvedValue(stored);

    await useCase.execute('tpl-1', dto);

    expect(update).not.toHaveBeenCalled();
    expect(saveBuffer).not.toHaveBeenCalled();
  });

  it('una plantilla inexistente responde 404', async () => {
    templateGateway.findOne.mockResolvedValue(null);

    await expect(useCase.execute('nope', dto)).rejects.toThrow(
      NotFoundException,
    );
    expect(generate).not.toHaveBeenCalled();
  });
});

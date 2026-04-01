import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { LookupCertificateUseCase } from './lookup-certificate.use-case';
import { CertificateGateway } from '../gateways/certificate.gateway';

/**
 * Tests para LookupCertificateUseCase — búsqueda pública de certificado.
 *
 * Este endpoint es PÚBLICO (no requiere JWT). Cualquiera puede verificar
 * si un certificado es real ingresando su número correlativo (ej: MR-00001).
 *
 * Por seguridad, solo retorna { id } — no expone datos del lote ni del template.
 * El frontend usa ese id para redirigir a /certificados/:id donde se muestra más info.
 *
 * Detalle importante: normaliza a UPPERCASE antes de buscar.
 * Así "mr-00001" y "MR-00001" encuentran el mismo certificado.
 */
describe('LookupCertificateUseCase', () => {
  let useCase: LookupCertificateUseCase;
  let certificateGateway: jest.Mocked<CertificateGateway>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        LookupCertificateUseCase,
        {
          provide: CertificateGateway,
          useValue: {
            findByNumber: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(LookupCertificateUseCase);
    certificateGateway = module.get(CertificateGateway);
  });

  it('lanza NotFoundException si el certificado no existe', async () => {
    certificateGateway.findByNumber.mockResolvedValue(null);

    await expect(useCase.execute('MR-99999')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('retorna solo { id } cuando el certificado existe (no expone datos sensibles)', async () => {
    certificateGateway.findByNumber.mockResolvedValue({
      id: 'cert-uuid-123',
      recipientName: 'María López', // esto NO debe aparecer en el resultado
      certificateNumber: 'MR-00001',
    } as any);

    const result = await useCase.execute('MR-00001');

    expect(result).toEqual({ id: 'cert-uuid-123' });
    // Verificar que NO expone otros campos
    expect(result).not.toHaveProperty('recipientName');
    expect(result).not.toHaveProperty('certificateNumber');
  });

  /**
   * El número se normaliza a UPPERCASE antes de la búsqueda.
   * Esto hace la búsqueda case-insensitive sin depender de la DB.
   */
  it('normaliza el número a uppercase antes de buscar', async () => {
    certificateGateway.findByNumber.mockResolvedValue({
      id: 'cert-uuid-123',
    } as any);

    await useCase.execute('mr-00001'); // minúsculas

    // El gateway debe recibir "MR-00001" en mayúsculas
    expect(certificateGateway.findByNumber).toHaveBeenCalledWith('MR-00001');
  });
});

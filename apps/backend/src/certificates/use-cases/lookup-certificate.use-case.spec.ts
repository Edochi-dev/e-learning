import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { LookupCertificateUseCase } from './lookup-certificate.use-case';
import { CertificateGateway } from '../gateways/certificate.gateway';

/**
 * Tests para LookupCertificateUseCase — verificación pública de certificado.
 *
 * El endpoint es PÚBLICO (no requiere JWT) y exige DOS datos: el número
 * correlativo y el nombre del titular. El número solo no basta a propósito:
 * es correlativo, y recorrerlo permitía cosechar los nombres de las alumnas.
 *
 * Solo retorna { id } — no expone datos del lote ni del template. El frontend
 * usa ese id para redirigir a /certificados/:id.
 */
describe('LookupCertificateUseCase', () => {
  let useCase: LookupCertificateUseCase;
  let certificateGateway: jest.Mocked<CertificateGateway>;

  const certificado = {
    id: 'cert-uuid-123',
    recipientName: 'María José Pérez',
    certificateNumber: 'MR-00001',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        LookupCertificateUseCase,
        {
          provide: CertificateGateway,
          useValue: { findByNumber: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(LookupCertificateUseCase);
    certificateGateway = module.get(CertificateGateway);
  });

  it('lanza NotFoundException si el certificado no existe', async () => {
    certificateGateway.findByNumber.mockResolvedValue(null);

    await expect(useCase.execute('MR-99999', 'Quien Sea')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('retorna solo { id } cuando número y nombre coinciden', async () => {
    certificateGateway.findByNumber.mockResolvedValue(certificado as any);

    const result = await useCase.execute('MR-00001', 'María José Pérez');

    expect(result).toEqual({ id: 'cert-uuid-123' });
    expect(result).not.toHaveProperty('recipientName');
    expect(result).not.toHaveProperty('certificateNumber');
  });

  it('normaliza el número a uppercase antes de buscar', async () => {
    certificateGateway.findByNumber.mockResolvedValue(certificado as any);

    await useCase.execute('mr-00001', 'María José Pérez');

    expect(certificateGateway.findByNumber).toHaveBeenCalledWith('MR-00001');
  });

  describe('la comprobación del nombre no rechaza a la titular legítima', () => {
    beforeEach(() => {
      certificateGateway.findByNumber.mockResolvedValue(certificado as any);
    });

    // Cada uno de estos falló alguna vez en algún formulario del mundo real.
    it.each([
      ['sin tildes', 'Maria Jose Perez'],
      ['todo en minúsculas', 'maría josé pérez'],
      ['todo en mayúsculas', 'MARÍA JOSÉ PÉREZ'],
      ['con espacios de sobra al pegar', '  María   José   Pérez  '],
      ['sin tildes y en minúsculas', 'maria jose perez'],
    ])('acepta el nombre %s', async (_caso, nombre) => {
      await expect(useCase.execute('MR-00001', nombre)).resolves.toEqual({
        id: 'cert-uuid-123',
      });
    });
  });

  describe('la comprobación del nombre sí frena la cosecha', () => {
    beforeEach(() => {
      certificateGateway.findByNumber.mockResolvedValue(certificado as any);
    });

    it.each([
      ['otra persona', 'Ana Gómez'],
      ['solo el nombre de pila', 'María'],
      ['solo el apellido', 'Pérez'],
      ['vacío', ''],
    ])('rechaza %s', async (_caso, nombre) => {
      await expect(useCase.execute('MR-00001', nombre)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  /**
   * INVARIANTE DE SEGURIDAD — no relajar.
   *
   * "El número no existe" y "el nombre no coincide" tienen que ser
   * indistinguibles desde fuera. Si el segundo devolviera otro error u otro
   * mensaje, recorrer el rango seguiría revelando QUÉ números están emitidos,
   * que es el primer paso de la cosecha que esto viene a impedir.
   */
  it('devuelve el mismo error cuando el número no existe que cuando el nombre no coincide', async () => {
    certificateGateway.findByNumber.mockResolvedValue(null);
    const inexistente = await useCase
      .execute('MR-99999', 'María José Pérez')
      .catch((e: Error) => e);

    certificateGateway.findByNumber.mockResolvedValue(certificado as any);
    const nombreMalo = await useCase
      .execute('MR-00001', 'Ana Gómez')
      .catch((e: Error) => e);

    expect(nombreMalo).toBeInstanceOf(NotFoundException);
    expect(inexistente).toBeInstanceOf(NotFoundException);
    expect((nombreMalo as Error).message).toBe((inexistente as Error).message);
  });
});

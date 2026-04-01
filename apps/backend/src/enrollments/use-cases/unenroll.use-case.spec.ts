import { Test } from '@nestjs/testing';
import { UnenrollUseCase } from './unenroll.use-case';
import { EnrollmentGateway } from '../gateways/enrollment.gateway';

/**
 * Tests para UnenrollUseCase — dar de baja al alumno de un curso.
 *
 * Este Use Case es un pass-through simple: recibe el enrollmentId y delega
 * al gateway. El ownership check (¿es mi matrícula?) ya fue hecho por el
 * EnrollmentOwnershipGuard en la capa de transporte.
 *
 * ¿Por qué testearlo si es solo una línea?
 *   1. Documenta el contrato (qué recibe, a quién llama)
 *   2. Si mañana se agrega lógica (email de confirmación, log de auditoría),
 *      los tests existentes atrapan cambios accidentales
 */
describe('UnenrollUseCase', () => {
  let useCase: UnenrollUseCase;
  let enrollmentGateway: jest.Mocked<EnrollmentGateway>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        UnenrollUseCase,
        {
          provide: EnrollmentGateway,
          useValue: {
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(UnenrollUseCase);
    enrollmentGateway = module.get(EnrollmentGateway);
  });

  it('delega la eliminación al gateway con el enrollmentId correcto', async () => {
    const enrollmentId = 'enrollment-uuid-123';

    await useCase.execute(enrollmentId);

    expect(enrollmentGateway.delete).toHaveBeenCalledWith(enrollmentId);
    expect(enrollmentGateway.delete).toHaveBeenCalledTimes(1);
  });
});

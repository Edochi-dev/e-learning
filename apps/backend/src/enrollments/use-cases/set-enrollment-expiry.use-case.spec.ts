import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SetEnrollmentExpiryUseCase } from './set-enrollment-expiry.use-case';
import { EnrollmentGateway } from '../gateways/enrollment.gateway';
import { Enrollment } from '../entities/enrollment.entity';

describe('SetEnrollmentExpiryUseCase', () => {
  let useCase: SetEnrollmentExpiryUseCase;
  let enrollmentGateway: jest.Mocked<EnrollmentGateway>;

  const enrollmentId = 'enrollment-uuid';

  const buildEnrollment = (expiresAt: Date | null): Enrollment =>
    Object.assign(new Enrollment(), { id: enrollmentId, expiresAt });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        SetEnrollmentExpiryUseCase,
        {
          provide: EnrollmentGateway,
          useValue: { findById: jest.fn(), updateExpiry: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(SetEnrollmentExpiryUseCase);
    enrollmentGateway = module.get(EnrollmentGateway);
  });

  it('lanza NotFoundException si la matrícula no existe', async () => {
    enrollmentGateway.findById.mockResolvedValue(null);

    await expect(useCase.execute(enrollmentId, new Date())).rejects.toThrow(
      NotFoundException,
    );

    expect(enrollmentGateway.updateExpiry).not.toHaveBeenCalled();
  });

  it('extiende el acceso a la fecha indicada', async () => {
    const expired = buildEnrollment(new Date('2026-01-01T00:00:00.000Z'));
    enrollmentGateway.findById.mockResolvedValue(expired);

    const newExpiry = new Date('2026-12-31T00:00:00.000Z');
    const result = await useCase.execute(enrollmentId, newExpiry);

    expect(enrollmentGateway.updateExpiry).toHaveBeenCalledWith(
      enrollmentId,
      newExpiry,
    );
    expect(result.expiresAt).toEqual(newExpiry);
    expect(result.isActive(new Date('2026-06-01T00:00:00.000Z'))).toBe(true);
  });

  it('vuelve el acceso permanente cuando recibe null', async () => {
    enrollmentGateway.findById.mockResolvedValue(
      buildEnrollment(new Date('2026-01-01T00:00:00.000Z')),
    );

    const result = await useCase.execute(enrollmentId, null);

    // null no es "no cambiar": es acceso sin vencimiento.
    expect(enrollmentGateway.updateExpiry).toHaveBeenCalledWith(
      enrollmentId,
      null,
    );
    expect(result.expiresAt).toBeNull();
    expect(result.isActive()).toBe(true);
  });
});

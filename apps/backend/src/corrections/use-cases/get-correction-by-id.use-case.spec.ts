import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GetCorrectionByIdUseCase } from './get-correction-by-id.use-case';
import { CorrectionGateway } from '../gateways/correction.gateway';
import { AssignmentSubmission } from '../entities/assignment-submission.entity';

describe('GetCorrectionByIdUseCase', () => {
  let useCase: GetCorrectionByIdUseCase;
  let correctionGateway: jest.Mocked<CorrectionGateway>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        GetCorrectionByIdUseCase,
        {
          provide: CorrectionGateway,
          useValue: { findById: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(GetCorrectionByIdUseCase);
    correctionGateway = module.get(CorrectionGateway);
  });

  it('retorna la submission cuando existe', async () => {
    const submission = {
      id: 'sub-uuid',
      status: 'pending',
      student: { name: 'María' },
      lesson: { title: 'Práctica' },
    } as unknown as AssignmentSubmission;
    correctionGateway.findById.mockResolvedValue(submission);

    const result = await useCase.execute('sub-uuid');

    expect(result).toBe(submission);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(correctionGateway.findById).toHaveBeenCalledWith('sub-uuid');
  });

  it('lanza NotFoundException cuando no existe', async () => {
    correctionGateway.findById.mockResolvedValue(null);

    await expect(useCase.execute('no-existe')).rejects.toThrow(
      NotFoundException,
    );
  });
});

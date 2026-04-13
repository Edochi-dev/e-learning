import { Test } from '@nestjs/testing';
import { ListPendingCorrectionsUseCase } from './list-pending-corrections.use-case';
import { CorrectionGateway } from '../gateways/correction.gateway';
import { AssignmentSubmission } from '../entities/assignment-submission.entity';

describe('ListPendingCorrectionsUseCase', () => {
  let useCase: ListPendingCorrectionsUseCase;
  let correctionGateway: jest.Mocked<CorrectionGateway>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ListPendingCorrectionsUseCase,
        {
          provide: CorrectionGateway,
          useValue: { findPending: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(ListPendingCorrectionsUseCase);
    correctionGateway = module.get(CorrectionGateway);
  });

  it('delega a gateway.findPending y retorna el resultado', async () => {
    const pending = [
      { id: '1', status: 'pending' },
      { id: '2', status: 'pending' },
    ] as unknown as AssignmentSubmission[];
    correctionGateway.findPending.mockResolvedValue(pending);

    const result = await useCase.execute();

    expect(result).toBe(pending);
    expect(result).toHaveLength(2);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(correctionGateway.findPending).toHaveBeenCalledTimes(1);
  });

  it('retorna array vacío cuando no hay pendientes', async () => {
    correctionGateway.findPending.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result).toEqual([]);
  });
});

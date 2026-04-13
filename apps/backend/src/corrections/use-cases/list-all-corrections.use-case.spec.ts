import { Test } from '@nestjs/testing';
import { ListAllCorrectionsUseCase } from './list-all-corrections.use-case';
import { CorrectionGateway } from '../gateways/correction.gateway';
import { AssignmentSubmission } from '../entities/assignment-submission.entity';

describe('ListAllCorrectionsUseCase', () => {
  let useCase: ListAllCorrectionsUseCase;
  let correctionGateway: jest.Mocked<CorrectionGateway>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ListAllCorrectionsUseCase,
        {
          provide: CorrectionGateway,
          useValue: { findAll: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(ListAllCorrectionsUseCase);
    correctionGateway = module.get(CorrectionGateway);
  });

  it('siempre pasa excludeStatus: pending al gateway', async () => {
    correctionGateway.findAll.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    await useCase.execute({}, 1, 20);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(correctionGateway.findAll).toHaveBeenCalledWith(
      { excludeStatus: 'pending' },
      1,
      20,
    );
  });

  it('pasa filtros del usuario junto con excludeStatus', async () => {
    correctionGateway.findAll.mockResolvedValue({
      data: [],
      total: 0,
      page: 2,
      limit: 10,
    });

    await useCase.execute(
      { status: 'approved', courseId: 'c-1', month: 3, year: 2026 },
      2,
      10,
    );

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(correctionGateway.findAll).toHaveBeenCalledWith(
      {
        status: 'approved',
        courseId: 'c-1',
        month: 3,
        year: 2026,
        excludeStatus: 'pending',
      },
      2,
      10,
    );
  });

  it('retorna el PaginatedResult del gateway tal cual', async () => {
    const paginated = {
      data: [{ id: '1', status: 'approved' }] as unknown as AssignmentSubmission[],
      total: 1,
      page: 1,
      limit: 20,
    };
    correctionGateway.findAll.mockResolvedValue(paginated);

    const result = await useCase.execute({}, 1, 20);

    expect(result).toBe(paginated);
    expect(result.total).toBe(1);
  });
});

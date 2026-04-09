import { Test } from '@nestjs/testing';
import { GetMyCorrectionStatusUseCase } from './get-my-correction-status.use-case';
import { CorrectionGateway } from '../gateways/correction.gateway';
import { AssignmentSubmission } from '../entities/assignment-submission.entity';

describe('GetMyCorrectionStatusUseCase', () => {
  let useCase: GetMyCorrectionStatusUseCase;
  let correctionGateway: jest.Mocked<CorrectionGateway>;

  const userId = 'student-uuid';
  const lessonId = 'lesson-uuid';

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        GetMyCorrectionStatusUseCase,
        {
          provide: CorrectionGateway,
          useValue: { findByStudentAndLesson: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(GetMyCorrectionStatusUseCase);
    correctionGateway = module.get(CorrectionGateway);
  });

  it('retorna la submission si existe', async () => {
    const submission = {
      id: 'sub-uuid',
      status: 'pending',
    } as unknown as AssignmentSubmission;
    correctionGateway.findByStudentAndLesson.mockResolvedValue(submission);

    const result = await useCase.execute(userId, lessonId);

    expect(result).toBe(submission);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(correctionGateway.findByStudentAndLesson).toHaveBeenCalledWith(
      userId,
      lessonId,
    );
  });

  it('retorna null si la alumna nunca envió', async () => {
    correctionGateway.findByStudentAndLesson.mockResolvedValue(null);

    const result = await useCase.execute(userId, lessonId);

    expect(result).toBeNull();
  });
});

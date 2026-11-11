import { Test } from '@nestjs/testing';
import { LessonStatus, LessonType } from '@maris-nails/shared';
import { GetCourseOverviewUseCase } from './get-course-overview.use-case';
import { CourseOutlineGateway } from '../../courses/gateways/course-outline.gateway';
import { LessonProgressGateway } from '../../progress/gateways/lesson-progress.gateway';
import { WatchProgressGateway } from '../../progress/gateways/watch-progress.gateway';
import { QuizResultsGateway } from '../../enrollments/gateways/quiz-results.gateway';
import { SubmissionStatusGateway } from '../../corrections/gateways/submission-status.gateway';

describe('GetCourseOverviewUseCase', () => {
  it('combina progreso, quizzes y entregas en el orden del curso', async () => {
    const module = await Test.createTestingModule({
      providers: [
        GetCourseOverviewUseCase,
        {
          provide: CourseOutlineGateway,
          useValue: {
            findOutline: jest.fn().mockResolvedValue([
              { id: 'c1', type: LessonType.CLASS },
              { id: 'c2', type: LessonType.CLASS },
              { id: 'q1', type: LessonType.EXAM },
              { id: 'p1', type: LessonType.CORRECTION },
            ]),
          },
        },
        {
          provide: LessonProgressGateway,
          useValue: {
            getCompletedLessonIds: jest.fn().mockResolvedValue(['c1']),
          },
        },
        {
          provide: WatchProgressGateway,
          useValue: {
            getWatchProgressByCourse: jest
              .fn()
              .mockResolvedValue({ c1: 100, c2: 45 }),
          },
        },
        {
          provide: QuizResultsGateway,
          useValue: {
            latestResultsByCourse: jest.fn().mockResolvedValue({ q1: false }),
          },
        },
        {
          provide: SubmissionStatusGateway,
          useValue: {
            statusesByCourse: jest.fn().mockResolvedValue({ p1: 'pending' }),
          },
        },
      ],
    }).compile();

    const overview = await module
      .get(GetCourseOverviewUseCase)
      .execute('user-1', 'course-1');

    expect(overview.lessons.map((l) => [l.lessonId, l.status])).toEqual([
      ['c1', LessonStatus.COMPLETED],
      ['c2', LessonStatus.IN_PROGRESS],
      ['q1', LessonStatus.FAILED],
      ['p1', LessonStatus.IN_REVIEW],
    ]);
    expect(overview.lessons[1].watchedPercent).toBe(45);
    expect(overview).toMatchObject({
      completedLessons: 1,
      totalLessons: 4,
      progressPercent: 25,
      nextLessonId: 'c2',
    });
  });
});

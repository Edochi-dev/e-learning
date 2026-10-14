import { NotFoundException } from '@nestjs/common';
import { FindPublicCourseUseCase } from './find-public-course.use-case';
import { FindCourseForAdminUseCase } from './find-course-for-admin.use-case';
import { CourseGateway } from '../gateways/course.gateway';
import { Course } from '../entities/course.entity';

const stored = {
  id: 'c1',
  title: 'Manicura',
  price: 10,
  description: 'd',
  lessons: [
    {
      id: 'l1',
      title: 'Examen',
      description: 'd',
      type: 'exam',
      order: 1,
      questions: [
        {
          id: 'q',
          text: '?',
          options: [{ id: 'o', text: 'A', isCorrect: true }],
        },
      ],
    },
  ],
} as unknown as Course;

describe('lectura de un curso', () => {
  let gateway: jest.Mocked<CourseGateway>;

  beforeEach(() => {
    gateway = {
      findOne: jest.fn().mockResolvedValue(stored),
    } as unknown as jest.Mocked<CourseGateway>;
  });

  describe('FindPublicCourseUseCase', () => {
    it('devuelve la vista pública, sin las respuestas', async () => {
      const result = await new FindPublicCourseUseCase(gateway).execute('c1');

      expect(result.title).toBe('Manicura');
      expect(JSON.stringify(result)).not.toContain('isCorrect');
    });

    it('lanza NotFoundException si el curso no existe', async () => {
      gateway.findOne.mockResolvedValue(null);
      await expect(
        new FindPublicCourseUseCase(gateway).execute('x'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('FindCourseForAdminUseCase', () => {
    it('devuelve el curso completo para el editor', async () => {
      await expect(
        new FindCourseForAdminUseCase(gateway).execute('c1'),
      ).resolves.toBe(stored);
    });

    it('lanza NotFoundException si el curso no existe', async () => {
      gateway.findOne.mockResolvedValue(null);
      await expect(
        new FindCourseForAdminUseCase(gateway).execute('x'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

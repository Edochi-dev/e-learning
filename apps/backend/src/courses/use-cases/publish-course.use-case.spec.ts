import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PublishCourseUseCase } from './publish-course.use-case';
import { UnpublishCourseUseCase } from './unpublish-course.use-case';
import { CourseGateway } from '../gateways/course.gateway';
import { Course } from '../entities/course.entity';
import { Lesson } from '../entities/lessons.entity';

const course = (overrides: Partial<Course> = {}) =>
  Object.assign(new Course(), {
    id: 'c1',
    publishedAt: null,
    lessons: [new Lesson()],
    ...overrides,
  });

describe('publicación de cursos', () => {
  let gateway: jest.Mocked<CourseGateway>;

  beforeEach(() => {
    gateway = {
      findOne: jest.fn(),
      setPublishedAt: jest.fn(),
    } as unknown as jest.Mocked<CourseGateway>;
  });

  describe('PublishCourseUseCase', () => {
    const publish = (id = 'c1') =>
      new PublishCourseUseCase(gateway).execute(id);

    it('publica un borrador con lecciones', async () => {
      gateway.findOne.mockResolvedValue(course());

      await publish();

      expect(gateway.setPublishedAt).toHaveBeenCalledWith(
        'c1',
        expect.any(Date),
      );
    });

    it('no publica un curso sin lecciones', async () => {
      gateway.findOne.mockResolvedValue(course({ lessons: [] }));

      await expect(publish()).rejects.toThrow(BadRequestException);
      expect(gateway.setPublishedAt).not.toHaveBeenCalled();
    });

    it('publicar dos veces conserva la fecha original', async () => {
      gateway.findOne.mockResolvedValue(
        course({ publishedAt: new Date('2026-10-01T00:00:00Z') }),
      );

      await publish();
      expect(gateway.setPublishedAt).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si el curso no existe', async () => {
      gateway.findOne.mockResolvedValue(null);
      await expect(publish('x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('UnpublishCourseUseCase', () => {
    it('vuelve el curso a borrador', async () => {
      gateway.findOne.mockResolvedValue(course({ publishedAt: new Date() }));

      await new UnpublishCourseUseCase(gateway).execute('c1');

      expect(gateway.setPublishedAt).toHaveBeenCalledWith('c1', null);
    });

    it('lanza NotFoundException si el curso no existe', async () => {
      gateway.findOne.mockResolvedValue(null);
      await expect(
        new UnpublishCourseUseCase(gateway).execute('x'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Course.isPublished', () => {
    it.each([
      [null, false],
      [undefined, false],
      [new Date(), true],
    ])('publishedAt=%p → %p', (publishedAt, expected) => {
      expect(Object.assign(new Course(), { publishedAt }).isPublished()).toBe(
        expected,
      );
    });
  });
});

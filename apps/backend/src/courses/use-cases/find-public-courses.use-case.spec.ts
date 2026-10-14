import { FindPublicCoursesUseCase } from './find-public-courses.use-case';
import { FindCoursesForAdminUseCase } from './find-courses-for-admin.use-case';
import { CourseGateway } from '../gateways/course.gateway';
import { Course } from '../entities/course.entity';

const page = {
  data: [
    {
      id: 'c1',
      title: 'Manicura',
      price: 10,
      description: 'd',
      lessons: [
        {
          id: 'l1',
          title: 'Clase',
          description: 'd',
          type: 'class',
          order: 0,
          videoData: { videoUrl: '/static/videos/secreto.mp4', isLive: false },
        },
      ],
    },
  ] as unknown as Course[],
  total: 1,
  page: 2,
  limit: 12,
};

describe('listado de cursos', () => {
  let gateway: jest.Mocked<CourseGateway>;

  beforeEach(() => {
    gateway = {
      findAll: jest.fn().mockResolvedValue(page),
    } as unknown as jest.Mocked<CourseGateway>;
  });

  it('el catálogo público pagina igual pero sin URLs de video', async () => {
    const result = await new FindPublicCoursesUseCase(gateway).execute(2, 12, {
      search: 'mani',
    });

    expect(gateway.findAll).toHaveBeenCalledWith(2, 12, { search: 'mani' });
    expect(result).toMatchObject({ total: 1, page: 2, limit: 12 });
    expect(result.data[0].title).toBe('Manicura');
    expect(JSON.stringify(result)).not.toContain('secreto.mp4');
  });

  it('la lista de la admin devuelve los cursos completos', async () => {
    await expect(
      new FindCoursesForAdminUseCase(gateway).execute(2, 12),
    ).resolves.toBe(page);
  });
});

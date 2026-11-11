import { LessonType, VideoProvider } from '@maris-nails/shared';
import { toPublicCourse } from './public-course.presenter';
import { Course } from '../entities/course.entity';

function course(): Course {
  return {
    id: 'c1',
    title: 'Manicura',
    price: '49.90' as unknown as number,
    description: 'Curso',
    thumbnailUrl: '/static/thumbnails/c1.webp',
    category: 'Uñas',
    level: 'beginner',
    accessDurationDays: 90,
    features: ['Certificado'],
    lessons: [
      {
        id: 'l1',
        title: 'Clase 1',
        description: 'Intro',
        type: LessonType.CLASS,
        order: 1,
        videoData: {
          videoUrl: 'https://youtu.be/dQw4w9WgXcQ',
          duration: '10:00',
          isLive: false,
          liveStartsAt: null,
          liveEndsAt: null,
        },
      },
      {
        id: 'l2',
        title: 'Examen',
        description: 'Final',
        type: LessonType.EXAM,
        order: 2,
        examData: { passingScore: 3 },
        questions: [
          {
            id: 'q1',
            text: '¿Cuál?',
            options: [
              { id: 'o1', text: 'A', isCorrect: true },
              { id: 'o2', text: 'B', isCorrect: false },
            ],
          },
        ],
      },
      {
        id: 'l3',
        title: 'Clase propia',
        description: 'Hosted',
        type: LessonType.CLASS,
        order: 3,
        videoData: {
          videoUrl: '/static/videos/clase3.mp4',
          duration: null,
          isLive: true,
          liveStartsAt: new Date('2026-10-20T22:00:00Z'),
          liveEndsAt: new Date('2026-10-20T23:00:00Z'),
        },
      },
    ],
  } as unknown as Course;
}

describe('toPublicCourse', () => {
  it('nunca incluye las respuestas del examen ni las URLs de video', () => {
    const json = JSON.stringify(toPublicCourse(course()));

    expect(json).not.toContain('isCorrect');
    expect(json).not.toContain('questions');
    expect(json).not.toContain('videoUrl');
    expect(json).not.toContain('dQw4w9WgXcQ');
    expect(json).not.toContain('clase3.mp4');
  });

  it('expone solo de dónde se sirve cada video', () => {
    const { lessons } = toPublicCourse(course());

    expect(lessons[0].videoData?.provider).toBe(VideoProvider.YOUTUBE);
    expect(lessons[2].videoData?.provider).toBe(VideoProvider.HOSTED);
  });

  it('conserva lo que la alumna y el catálogo necesitan', () => {
    const view = toPublicCourse(course());

    expect(view).toMatchObject({
      id: 'c1',
      title: 'Manicura',
      price: 49.9,
      accessDurationDays: 90,
      features: ['Certificado'],
    });
    expect(view.lessons.map((l) => l.id)).toEqual(['l1', 'l2', 'l3']);
    expect(view.lessons[1].examData).toEqual({ passingScore: 3 });
    expect(view.lessons[2].videoData).toMatchObject({
      isLive: true,
      liveStartsAt: '2026-10-20T22:00:00.000Z',
      liveEndsAt: '2026-10-20T23:00:00.000Z',
    });
  });

  it('un campo nuevo de la entidad no se filtra por defecto', () => {
    const withSecret = course() as Course & { internalNotes: string };
    withSecret.internalNotes = 'secreto';

    expect(JSON.stringify(toPublicCourse(withSecret))).not.toContain('secreto');
  });
});

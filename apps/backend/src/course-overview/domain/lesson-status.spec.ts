import { LessonStatus, LessonType } from '@maris-nails/shared';
import { lessonStatus, nextLessonId } from './lesson-status';

const base = { completed: false, watchedPercent: 0 };

describe('lessonStatus', () => {
  it('una lección completada es COMPLETED sea del tipo que sea', () => {
    for (const type of Object.values(LessonType)) {
      expect(lessonStatus(type, { ...base, completed: true })).toBe(
        LessonStatus.COMPLETED,
      );
    }
  });

  it('clase: empezada si vio algo, sin empezar si no', () => {
    expect(lessonStatus(LessonType.CLASS, base)).toBe(LessonStatus.NOT_STARTED);
    expect(
      lessonStatus(LessonType.CLASS, { ...base, watchedPercent: 40 }),
    ).toBe(LessonStatus.IN_PROGRESS);
  });

  it('quiz: reprobado solo si su último intento falló', () => {
    expect(lessonStatus(LessonType.EXAM, base)).toBe(LessonStatus.NOT_STARTED);
    expect(lessonStatus(LessonType.EXAM, { ...base, quizPassed: false })).toBe(
      LessonStatus.FAILED,
    );
  });

  it('práctica: refleja el estado de la entrega', () => {
    expect(lessonStatus(LessonType.CORRECTION, base)).toBe(
      LessonStatus.NOT_STARTED,
    );
    expect(
      lessonStatus(LessonType.CORRECTION, { ...base, submission: 'pending' }),
    ).toBe(LessonStatus.IN_REVIEW);
    expect(
      lessonStatus(LessonType.CORRECTION, { ...base, submission: 'rejected' }),
    ).toBe(LessonStatus.NEEDS_CHANGES);
  });
});

describe('nextLessonId', () => {
  const l = (lessonId: string, status: LessonStatus) => ({ lessonId, status });

  it('salta lo completado y lo que espera revisión de la profesora', () => {
    expect(
      nextLessonId([
        l('a', LessonStatus.COMPLETED),
        l('b', LessonStatus.IN_REVIEW),
        l('c', LessonStatus.IN_PROGRESS),
        l('d', LessonStatus.NOT_STARTED),
      ]),
    ).toBe('c');
  });

  it('una práctica con correcciones espera a la alumna: es la siguiente', () => {
    expect(
      nextLessonId([
        l('a', LessonStatus.COMPLETED),
        l('b', LessonStatus.NEEDS_CHANGES),
      ]),
    ).toBe('b');
  });

  it('sin nada pendiente de la alumna, no hay siguiente', () => {
    expect(
      nextLessonId([
        l('a', LessonStatus.COMPLETED),
        l('b', LessonStatus.IN_REVIEW),
      ]),
    ).toBeNull();
  });
});

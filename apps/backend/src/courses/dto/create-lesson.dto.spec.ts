import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateLessonDto } from './create-lesson.dto';

const liveLesson = (liveStartsAt: string, liveEndsAt: string) =>
  plainToInstance(CreateLessonDto, {
    title: 'Clase en vivo',
    description: 'd',
    type: 'class',
    videoUrl: 'https://youtu.be/dQw4w9WgXcQ',
    isLive: true,
    liveStartsAt,
    liveEndsAt,
  });

const errorsOn = async (dto: CreateLessonDto, property: string) =>
  (await validate(dto)).filter((e) => e.property === property);

describe('CreateLessonDto — horario de la clase en vivo', () => {
  it.each([
    ['UTC', '2026-10-20T22:00:00.000Z', '2026-10-20T23:00:00.000Z'],
    ['offset', '2026-10-20T19:00:00-03:00', '2026-10-20T20:00:00-03:00'],
  ])('acepta instantes con zona (%s)', async (_, start, end) => {
    const dto = liveLesson(start, end);
    expect(await errorsOn(dto, 'liveStartsAt')).toHaveLength(0);
    expect(await errorsOn(dto, 'liveEndsAt')).toHaveLength(0);
  });

  it('rechaza una hora sin zona: el servidor no adivina de qué país es', async () => {
    const dto = liveLesson('2026-10-20T19:00:00', '2026-10-20T20:00:00');
    expect(await errorsOn(dto, 'liveStartsAt')).toHaveLength(1);
    expect(await errorsOn(dto, 'liveEndsAt')).toHaveLength(1);
  });

  it('no exige horario a una clase grabada', async () => {
    const dto = plainToInstance(CreateLessonDto, {
      title: 'Grabada',
      description: 'd',
      type: 'class',
      videoUrl: 'https://youtu.be/dQw4w9WgXcQ',
      isLive: false,
    });
    expect(await validate(dto)).toHaveLength(0);
  });
});

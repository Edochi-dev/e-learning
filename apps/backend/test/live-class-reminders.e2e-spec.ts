import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource, In } from 'typeorm';
import { AppModule } from '../src/app.module';
import { User } from '../src/users/entities/user.entity';
import { Course } from '../src/courses/entities/course.entity';
import { Lesson } from '../src/courses/entities/lessons.entity';
import { VideoLesson } from '../src/courses/entities/video-lesson.entity';
import { Enrollment } from '../src/enrollments/entities/enrollment.entity';
import { EmailOutboxMessage } from '../src/notifications/entities/email-outbox-message.entity';
import { LiveClassReminderGateway } from '../src/live-class-reminders/gateways/live-class-reminder.gateway';
import { SendLiveClassRemindersUseCase } from '../src/live-class-reminders/use-cases/send-live-class-reminders.use-case';

/**
 * Live class reminders: the claim is one SQL statement (window, active
 * enrollments, ON CONFLICT), so only the real database can validate it.
 * Dates sit in 2041 so the every-minute cron of this app never finds them.
 */
const NOW = new Date('2041-06-15T12:00:00Z');
const minutesFromNow = (minutes: number) =>
  new Date(NOW.getTime() + minutes * 60_000);

describe('Avisos de clase en vivo (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let gateway: LiveClassReminderGateway;
  let useCase: SendLiveClassRemindersUseCase;

  const users: Record<string, User> = {};
  let soonId: string;
  let courseId: string;

  async function user(key: string): Promise<User> {
    const repo = dataSource.getRepository(User);
    return repo.save(
      repo.create({
        email: `avisos.${key}@test.local`,
        fullName: `Alumna ${key}`,
        password: 'x',
      }),
    );
  }

  async function lesson(
    title: string,
    startsInMinutes: number,
    isLive = true,
  ): Promise<string> {
    const entity = Object.assign(new Lesson(), {
      title,
      description: 'd',
      type: 'class',
      order: 0,
      courseId,
    });
    entity.videoData = Object.assign(new VideoLesson(), {
      videoUrl: '/static/videos/vivo.mp4',
      isLive,
      liveStartsAt: minutesFromNow(startsInMinutes),
      liveEndsAt: minutesFromNow(startsInMinutes + 60),
    });
    return (await dataSource.getRepository(Lesson).save(entity)).id;
  }

  const claimedFor = async (now: Date) =>
    (await gateway.claimDue(now, 60)).filter((r) => r.courseId === courseId);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
    gateway = app.get(LiveClassReminderGateway);
    useCase = app.get(SendLiveClassRemindersUseCase);

    const courses = dataSource.getRepository(Course);
    courseId = (
      await courses.save(
        courses.create({ title: 'Curso Avisos', price: 1, description: 'd' }),
      )
    ).id;
    const otherCourse = await courses.save(
      courses.create({
        title: 'Curso Ajeno Avisos',
        price: 1,
        description: 'd',
      }),
    );

    for (const key of ['activa', 'conFecha', 'vencida', 'ajena']) {
      users[key] = await user(key);
    }
    await dataSource.getRepository(Enrollment).save([
      { userId: users.activa.id, courseId, expiresAt: null },
      {
        userId: users.conFecha.id,
        courseId,
        expiresAt: minutesFromNow(60 * 24 * 30),
      },
      { userId: users.vencida.id, courseId, expiresAt: minutesFromNow(-60) },
      { userId: users.ajena.id, courseId: otherCourse.id, expiresAt: null },
    ]);

    soonId = await lesson('Vivo en 59 min', 59);
    await lesson('Vivo en 61 min', 61);
    await lesson('Vivo que ya empezó', -5);
    await lesson('Grabada en 30 min', 30, false);
  });

  afterAll(async () => {
    await app.close();
  });

  it('avisa solo de la clase dentro de la hora, a las matrículas activas, una sola vez', async () => {
    const claimed = await claimedFor(NOW);

    expect(claimed.map((r) => r.lessonId)).toEqual([soonId, soonId]);
    expect(claimed.map((r) => r.email).sort()).toEqual([
      users.activa.email,
      users.conFecha.email,
    ]);
    expect(await claimedFor(NOW)).toEqual([]);
  });

  it('si la profe cambia la hora, avisa de nuevo para el horario nuevo', async () => {
    await dataSource
      .getRepository(VideoLesson)
      .update({ lessonId: soonId }, { liveStartsAt: minutesFromNow(45) });

    const claimed = await claimedFor(NOW);
    expect(claimed).toHaveLength(2);
    expect(claimed[0].startsAt).toEqual(minutesFromNow(45));
  });

  it('dos procesos a la vez no duplican avisos', async () => {
    const lessonId = await lesson('Vivo concurrente', 30);

    const [a, b] = await Promise.all([claimedFor(NOW), claimedFor(NOW)]);
    const forLesson = [...a, ...b].filter((r) => r.lessonId === lessonId);
    expect(forLesson).toHaveLength(2);
  });

  it('deja el correo en la cola de envío con el enlace a la clase', async () => {
    const lessonId = await lesson('Vivo con correo', 50);

    await useCase.execute(NOW);

    const emails = await dataSource.getRepository(EmailOutboxMessage).findBy({
      recipient: In([users.activa.email, users.conFecha.email]),
      subject: 'Tu clase en vivo empieza en 50 minutos',
    });
    expect(emails).toHaveLength(2);
    expect(emails[0].body).toContain(
      `/courses/${courseId}/learn?leccion=${lessonId}`,
    );
  });
});

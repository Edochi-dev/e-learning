import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { DataSource, QueryRunner } from 'typeorm';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { UserRole } from '@maris-nails/shared';
import { AppModule } from '../src/app.module';
import { User } from '../src/users/entities/user.entity';
import { Course } from '../src/courses/entities/course.entity';
import { Lesson } from '../src/courses/entities/lessons.entity';
import { Enrollment } from '../src/enrollments/entities/enrollment.entity';
import { CorrectionReviewGateway } from '../src/corrections/gateways/correction-review.gateway';
import { ReviewTranscriptionQueue } from '../src/corrections/gateways/review-transcription-queue.gateway';
import { ExpiredReviewAudioGateway } from '../src/corrections/gateways/expired-review-audio.gateway';
import { CorrectionAudioStore } from '../src/corrections/gateways/correction-audio-store.gateway';
import { TranscriptStatus } from '../src/corrections/domain/transcript-status';
import { AddCorrectionReviews1784900000000 } from '../src/database/migrations/1784900000000-AddCorrectionReviews';
import { SubmissionDatesAsInstants1785100000000 } from '../src/database/migrations/1785100000000-SubmissionDatesAsInstants';

/**
 * Review history against real Postgres: the legacy-feedback migration (time
 * zone arithmetic), the review transaction, the queue claim and the audio
 * endpoint's ownership rule. ffmpeg is not involved: audio files are written
 * straight to the store.
 */
describe('Revisiones de corrección con audio (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let reviews: CorrectionReviewGateway;
  let store: CorrectionAudioStore;
  const savedFiles: string[] = [];

  // Sufijo propio: los specs comparten la base efímera.
  const owner = {
    fullName: 'Ana Audio',
    email: 'ana.audio@test.local',
    password: 'passw0rd123',
  };
  const other = {
    fullName: 'Luisa Audio',
    email: 'luisa.audio@test.local',
    password: 'passw0rd123',
  };
  const admin = {
    fullName: 'Profe Audio',
    email: 'profe.audio@test.local',
    password: 'passw0rd123',
  };
  let ownerId: string;
  let lessonId: string;

  async function insertSubmission(status = 'pending'): Promise<string> {
    const [row]: { id: string }[] = await dataSource.query(
      `INSERT INTO "assignment_submissions" ("studentId", "lessonId", "photoUrl", "status")
       VALUES ($1, $2, '/static/corrections/x.jpg', $3) RETURNING "id"`,
      [ownerId, lessonId, status],
    );
    return row.id;
  }

  async function newLesson(): Promise<string> {
    const course = await dataSource.getRepository(Course).findOneByOrFail({
      title: 'Curso Audio E2E',
    });
    const lesson = new Lesson();
    lesson.title = `Corrección ${randomUUID()}`;
    lesson.description = 'Lección de corrección';
    lesson.type = 'correction';
    lesson.order = 0;
    lesson.courseId = course.id;
    return (await dataSource.getRepository(Lesson).save(lesson)).id;
  }

  async function login(creds: { email: string; password: string }) {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/users/login').send(creds).expect(200);
    return agent;
  }

  async function recordReview(
    submissionId: string,
    overrides: Partial<{
      audioExpiresAt: Date;
      reviewedAt: Date;
      transcriptStatus: TranscriptStatus;
      withAudio: boolean;
    }> = {},
  ): Promise<string> {
    const id = randomUUID();
    const audioFile =
      overrides.withAudio === false
        ? null
        : await store.save(id, Buffer.from(`audio-${id}`));
    if (audioFile) savedFiles.push(audioFile);
    await reviews.record({
      id,
      submissionId,
      decision: 'rejected',
      audioFile: audioFile as string,
      audioDurationSeconds: 12,
      audioExpiresAt:
        overrides.audioExpiresAt ?? new Date('2099-01-01T00:00:00Z'),
      transcriptStatus:
        overrides.transcriptStatus ?? TranscriptStatus.UNAVAILABLE,
      reviewedAt: overrides.reviewedAt ?? new Date(),
    });
    return id;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector)),
    );
    await app.init();

    dataSource = app.get(DataSource);
    reviews = app.get(CorrectionReviewGateway);
    store = app.get(CorrectionAudioStore);

    const course = await dataSource.getRepository(Course).save(
      dataSource.getRepository(Course).create({
        title: 'Curso Audio E2E',
        price: 10,
        description: 'Curso para probar las revisiones con audio.',
      }),
    );
    for (const u of [owner, other, admin]) {
      await request(app.getHttpServer()).post('/users').send(u).expect(201);
    }
    const users = dataSource.getRepository(User);
    await users.update({ email: admin.email }, { role: UserRole.ADMIN });
    ownerId = (await users.findOneByOrFail({ email: owner.email })).id;
    await dataSource
      .getRepository(Enrollment)
      .save({ userId: ownerId, courseId: course.id });
  });

  beforeEach(async () => {
    lessonId = await newLesson();
  });

  afterAll(async () => {
    for (const file of savedFiles) await store.delete(file);
    await app.close();
  });

  describe('migración de los comentarios escritos', () => {
    const migration = new AddCorrectionReviews1784900000000();
    // Later migrations change the same columns: undo them first so the
    // scenario runs on the schema this migration was written for.
    const later = new SubmissionDatesAsInstants1785100000000();

    async function run(
      direction: 'up' | 'down',
      target: {
        up(r: QueryRunner): Promise<void>;
        down(r: QueryRunner): Promise<void>;
      } = migration,
    ): Promise<void> {
      const runner = dataSource.createQueryRunner();
      try {
        await target[direction](runner);
      } finally {
        await runner.release();
      }
    }

    beforeAll(() => run('down', later));
    afterAll(() => run('up', later));

    it('convierte cada comentario en una revisión sin audio, en hora de Chile', async () => {
      await run('down');
      try {
        const [row]: { id: string }[] = await dataSource.query(
          `INSERT INTO "assignment_submissions"
             ("studentId", "lessonId", "photoUrl", "status", "feedback", "reviewedAt")
           VALUES ($1, $2, '/static/corrections/y.jpg', 'pending', 'Repite la cutícula', '2026-10-01 18:30:00')
           RETURNING "id"`,
          [ownerId, lessonId],
        );
        await run('up');

        const [review]: {
          decision: string;
          transcript: string;
          transcriptStatus: string;
          audioFile: string | null;
          reviewedAt: Date;
        }[] = await dataSource.query(
          `SELECT * FROM "correction_reviews" WHERE "submissionId" = $1`,
          [row.id],
        );
        // A pending submission with feedback was rejected, then re-sent.
        expect(review.decision).toBe('rejected');
        expect(review.transcript).toBe('Repite la cutícula');
        expect(review.transcriptStatus).toBe('done');
        expect(review.audioFile).toBeNull();
        // 18:30 in Santiago (UTC-3 in October) is 21:30 UTC.
        expect(review.reviewedAt.toISOString()).toBe(
          '2026-10-01T21:30:00.000Z',
        );
      } finally {
        const hasTable: { exists: boolean }[] = await dataSource.query(
          `SELECT to_regclass('correction_reviews') IS NOT NULL AS exists`,
        );
        if (!hasTable[0].exists) await run('up');
      }
    });
  });

  describe('registro de una revisión', () => {
    it('crea la revisión y mueve la entrega a la decisión, juntas', async () => {
      const submissionId = await insertSubmission();
      await recordReview(submissionId);

      const [submission]: { status: string; reviewedAt: Date | null }[] =
        await dataSource.query(
          `SELECT "status", "reviewedAt" FROM "assignment_submissions" WHERE "id" = $1`,
          [submissionId],
        );
      expect(submission.status).toBe('rejected');
      expect(submission.reviewedAt).not.toBeNull();
    });

    it('si la revisión falla, la entrega no cambia', async () => {
      const submissionId = await insertSubmission();
      await expect(
        reviews.record({
          id: 'no-es-un-uuid',
          submissionId,
          decision: 'approved',
          audioFile: 'x.m4a',
          audioDurationSeconds: 1,
          audioExpiresAt: new Date(),
          transcriptStatus: TranscriptStatus.PENDING,
          reviewedAt: new Date(),
        }),
      ).rejects.toThrow();

      const [submission]: { status: string }[] = await dataSource.query(
        `SELECT "status" FROM "assignment_submissions" WHERE "id" = $1`,
        [submissionId],
      );
      expect(submission.status).toBe('pending');
    });
  });

  describe('GET /corrections/reviews/:id/audio', () => {
    it('la alumna dueña escucha su audio', async () => {
      const reviewId = await recordReview(await insertSubmission());
      const agent = await login(owner);
      const res = await agent
        .get(`/corrections/reviews/${reviewId}/audio`)
        .buffer(true)
        .parse((response, done) => {
          const chunks: Buffer[] = [];
          response.on('data', (c: Buffer) => chunks.push(c));
          response.on('end', () => done(null, Buffer.concat(chunks)));
        })
        .expect(200);
      expect(res.headers['content-type']).toContain('audio/mp4');
      expect(res.headers['cache-control']).toBe('private, no-store');
      expect((res.body as Buffer).toString()).toBe(`audio-${reviewId}`);
    });

    it('la profesora (admin) también lo escucha', async () => {
      const reviewId = await recordReview(await insertSubmission());
      const agent = await login(admin);
      await agent.get(`/corrections/reviews/${reviewId}/audio`).expect(200);
    });

    it('otra alumna recibe 404, como si no existiera', async () => {
      const reviewId = await recordReview(await insertSubmission());
      const agent = await login(other);
      await agent.get(`/corrections/reviews/${reviewId}/audio`).expect(404);
    });

    it('sin sesión responde 401', async () => {
      const reviewId = await recordReview(await insertSubmission());
      await request(app.getHttpServer())
        .get(`/corrections/reviews/${reviewId}/audio`)
        .expect(401);
    });

    it('un audio ya borrado por vencimiento responde 403', async () => {
      const reviewId = await recordReview(await insertSubmission(), {
        withAudio: false,
      });
      const agent = await login(owner);
      await agent.get(`/corrections/reviews/${reviewId}/audio`).expect(403);
    });

    it('la entrega de la alumna trae su historial sin exponer el archivo', async () => {
      const submissionId = await insertSubmission();
      const reviewId = await recordReview(submissionId);
      const agent = await login(owner);
      const res = await agent.get(`/corrections/me/${lessonId}`).expect(200);
      const body = res.body as { reviews: Record<string, unknown>[] };
      expect(body.reviews[0].id).toBe(reviewId);
      expect(body.reviews[0].hasAudio).toBe(true);
      expect(body.reviews[0]).not.toHaveProperty('audioFile');
    });
  });

  describe('cola de transcripción y retención', () => {
    const queue = () => app.get(ReviewTranscriptionQueue);
    const expired = () => app.get(ExpiredReviewAudioGateway);

    it('dos reclamos simultáneos nunca toman la misma revisión', async () => {
      const longAgo = new Date('1990-01-01T00:00:00Z');
      const a = await recordReview(await insertSubmission(), {
        transcriptStatus: TranscriptStatus.PENDING,
        reviewedAt: longAgo,
      });
      lessonId = await newLesson();
      const b = await recordReview(await insertSubmission(), {
        transcriptStatus: TranscriptStatus.PENDING,
        reviewedAt: new Date(longAgo.getTime() + 1000),
      });

      const [first, second] = await Promise.all([
        queue().claimNext(),
        queue().claimNext(),
      ]);
      const claimed = [first?.reviewId, second?.reviewId].sort();
      expect(claimed).toEqual([a, b].sort());

      await queue().markTranscribed(a, 'Hola Ana');
      await queue().markFailed(b);
      const rows: {
        id: string;
        transcriptStatus: string;
        transcript: string | null;
      }[] = await dataSource.query(
        `SELECT "id", "transcriptStatus", "transcript" FROM "correction_reviews" WHERE "id" = ANY($1)`,
        [[a, b]],
      );
      const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
      expect(byId[a]).toMatchObject({
        transcriptStatus: 'done',
        transcript: 'Hola Ana',
      });
      expect(byId[b].transcriptStatus).toBe('failed');
    });

    it('al encender la transcripción encola lo grabado sin ella, si el audio sigue', async () => {
      const withAudio = await recordReview(await insertSubmission(), {
        transcriptStatus: TranscriptStatus.UNAVAILABLE,
      });
      lessonId = await newLesson();
      const audioGone = await recordReview(await insertSubmission(), {
        transcriptStatus: TranscriptStatus.UNAVAILABLE,
        withAudio: false,
      });

      await queue().queueUntranscribed();

      const rows: { id: string; transcriptStatus: string }[] =
        await dataSource.query(
          `SELECT "id", "transcriptStatus" FROM "correction_reviews" WHERE "id" = ANY($1)`,
          [[withAudio, audioGone]],
        );
      const status = Object.fromEntries(
        rows.map((r) => [r.id, r.transcriptStatus]),
      );
      expect(status[withAudio]).toBe('pending');
      expect(status[audioGone]).toBe('unavailable');
    });

    it('encuentra solo los audios vencidos y conserva la revisión al limpiarlos', async () => {
      const now = new Date('2030-06-01T00:00:00Z');
      const due = await recordReview(await insertSubmission(), {
        audioExpiresAt: new Date('2030-05-31T00:00:00Z'),
      });
      lessonId = await newLesson();
      const notYet = await recordReview(await insertSubmission(), {
        audioExpiresAt: new Date('2030-06-02T00:00:00Z'),
      });

      const found = (await expired().findExpired(now, 1000)).map(
        (e) => e.reviewId,
      );
      expect(found).toContain(due);
      expect(found).not.toContain(notYet);

      await expired().clearAudio(due);
      const [row]: { audioFile: string | null }[] = await dataSource.query(
        `SELECT "audioFile" FROM "correction_reviews" WHERE "id" = $1`,
        [due],
      );
      expect(row.audioFile).toBeNull();
    });
  });
});

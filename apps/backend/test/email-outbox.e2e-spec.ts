import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { AppModule } from '../src/app.module';
import { NotificationGateway } from '../src/notifications/gateways/notification.gateway';
import { EmailOutboxQueue } from '../src/notifications/gateways/email-outbox-queue.gateway';
import { EmailPriority } from '../src/notifications/domain/email-priority';
import { EmailOutboxMessage } from '../src/notifications/entities/email-outbox-message.entity';
import { html } from '../src/notifications/templates/safe-html';

/**
 * The outbox claim is SQL (SKIP LOCKED, ordering, due filter) that mocked
 * gateways cannot exercise.
 *
 * Rows are scheduled in 2100 and claimed with that `now`, so the delivery
 * workers of the apps booted by other specs never see them.
 */
describe('Bandeja de salida de correos (e2e)', () => {
  const FUTURE = new Date('2100-01-01T00:00:00Z');
  const CLAIM_AT = new Date('2100-01-01T00:00:01Z');

  let app: INestApplication;
  let dataSource: DataSource;
  let queue: EmailOutboxQueue;

  async function insertDue(
    tag: string,
    priority: EmailPriority,
    createdAt: string,
  ): Promise<string> {
    const [row]: { id: string }[] = await dataSource.query(
      `INSERT INTO "email_outbox"
        ("recipient", "subject", "body", "priority", "nextAttemptAt", "createdAt")
       VALUES ($1, 's', '<p>b</p>', $2, $3, $4)
       RETURNING "id"`,
      [`${tag}@outbox.test`, priority, FUTURE, createdAt],
    );
    return row.id;
  }

  async function find(id: string): Promise<EmailOutboxMessage> {
    return dataSource.getRepository(EmailOutboxMessage).findOneByOrFail({ id });
  }

  const mine = (rows: EmailOutboxMessage[], tag: string) =>
    rows.filter((row) => row.recipient.startsWith(tag));

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);
    queue = app.get(EmailOutboxQueue);
  });

  afterAll(async () => {
    await app.close();
  });

  it('NotificationGateway encola el correo renderizado con su prioridad', async () => {
    const recipient = `${randomUUID()}@outbox.test`;
    await app.get(NotificationGateway).sendEmail(
      {
        to: recipient,
        subject: 'Hola',
        content: { heading: 'Hola', body: html`<p>Texto de prueba</p>` },
      },
      EmailPriority.HIGH,
    );

    const row = await dataSource
      .getRepository(EmailOutboxMessage)
      .findOneByOrFail({ recipient });
    expect(row.subject).toBe('Hola');
    expect(row.priority).toBe(EmailPriority.HIGH);
    expect(row.body).toContain('<p>Texto de prueba</p>');
    expect(row.textBody).toContain('Texto de prueba');
  });

  it('reclama por prioridad y luego antigüedad, e incrementa los intentos', async () => {
    const tag = randomUUID();
    const oldNormal = await insertDue(
      `${tag}-a`,
      EmailPriority.NORMAL,
      '2026-01-01T00:00:00Z',
    );
    const newHigh = await insertDue(
      `${tag}-b`,
      EmailPriority.HIGH,
      '2026-01-02T00:00:00Z',
    );
    const oldHigh = await insertDue(
      `${tag}-c`,
      EmailPriority.HIGH,
      '2026-01-01T00:00:00Z',
    );

    const claimed = mine(await queue.claimDue(50, CLAIM_AT), tag);

    expect(claimed.map((row) => row.id)).toEqual([oldHigh, newHigh, oldNormal]);
    expect(claimed.every((row) => row.status === 'sending')).toBe(true);
    expect(claimed.every((row) => row.attempts === 1)).toBe(true);
  });

  it('no reclama correos cuyo próximo intento aún no llega', async () => {
    const tag = randomUUID();
    const id = await insertDue(tag, EmailPriority.HIGH, '2026-01-01T00:00:00Z');

    const claimed = await queue.claimDue(50, new Date('2099-12-31T23:59:59Z'));

    expect(claimed.map((row) => row.id)).not.toContain(id);
    expect((await find(id)).status).toBe('pending');
  });

  it('dos reclamos simultáneos nunca reciben el mismo correo', async () => {
    const tag = randomUUID();
    const ids = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        insertDue(`${tag}-${i}`, EmailPriority.NORMAL, '2026-01-01T00:00:00Z'),
      ),
    );

    const [first, second] = await Promise.all([
      queue.claimDue(15, CLAIM_AT),
      queue.claimDue(15, CLAIM_AT),
    ]);
    const firstIds = mine(first, tag).map((row) => row.id);
    const secondIds = mine(second, tag).map((row) => row.id);

    expect(firstIds.filter((id) => secondIds.includes(id))).toEqual([]);
    expect([...firstIds, ...secondIds].sort()).toEqual([...ids].sort());
  });

  it('registra el envío, el reintento, el fallo y la recuperación tras un reinicio', async () => {
    const tag = randomUUID();
    const sent = await insertDue(`${tag}-s`, 0, '2026-01-01T00:00:00Z');
    const retried = await insertDue(`${tag}-r`, 0, '2026-01-01T00:00:00Z');
    const failed = await insertDue(`${tag}-f`, 0, '2026-01-01T00:00:00Z');
    const stuck = await insertDue(`${tag}-x`, 0, '2026-01-01T00:00:00Z');
    await queue.claimDue(50, CLAIM_AT);

    await queue.markSent(sent, 'smtp-relay.brevo.com');
    await queue.scheduleRetry(retried, FUTURE, 'timeout');
    await queue.markFailed(failed, 'rejected');
    await queue.requeueInterrupted();

    expect(await find(sent)).toMatchObject({
      status: 'sent',
      provider: 'smtp-relay.brevo.com',
    });
    expect((await find(sent)).sentAt).toBeInstanceOf(Date);
    expect(await find(retried)).toMatchObject({
      status: 'pending',
      lastError: 'timeout',
      attempts: 1,
    });
    expect(await find(failed)).toMatchObject({
      status: 'failed',
      lastError: 'rejected',
    });
    expect(await find(stuck)).toMatchObject({ status: 'pending', attempts: 1 });
  });
});

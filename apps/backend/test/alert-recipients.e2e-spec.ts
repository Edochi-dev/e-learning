import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { AppModule } from '../src/app.module';
import { AlertRecipientsGateway } from '../src/users/gateways/alert-recipients.gateway';
import { AlertTopic } from '../src/users/domain/alert-topic';

/** The topic lookup is a Postgres array query that mocked gateways cannot exercise. */
describe('Destinatarios de avisos por tema (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let gateway: AlertRecipientsGateway;
  const tag = randomUUID();

  async function insertUser(
    name: string,
    role: 'admin' | 'student',
    topics: string[],
  ): Promise<string> {
    const email = `${name}-${tag}@alerts.test`;
    await dataSource.query(
      `INSERT INTO "users" ("email", "fullName", "password", "role", "alertTopics")
       VALUES ($1, $2, 'x', $3, $4)`,
      [email, name, role, topics],
    );
    return email;
  }

  const mine = (emails: string[]) => emails.filter((e) => e.includes(tag));

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
    gateway = app.get(AlertRecipientsGateway);
  });

  afterAll(async () => {
    await app.close();
  });

  it('devuelve solo los admins suscritos a cada tema', async () => {
    const teacher = await insertUser('profe', 'admin', [
      AlertTopic.PENDING_CORRECTIONS,
    ]);
    const backup = await insertUser('respaldo', 'admin', [
      AlertTopic.NAME_CHANGE_REQUESTS,
    ]);
    await insertUser('silencioso', 'admin', []);
    await insertUser('alumna', 'student', [AlertTopic.PENDING_CORRECTIONS]);

    expect(
      mine(await gateway.findEmailsFor(AlertTopic.PENDING_CORRECTIONS)),
    ).toEqual([teacher]);
    expect(
      mine(await gateway.findEmailsFor(AlertTopic.NAME_CHANGE_REQUESTS)),
    ).toEqual([backup]);
  });
});

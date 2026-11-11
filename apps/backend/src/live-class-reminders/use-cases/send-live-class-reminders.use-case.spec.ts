import { SendLiveClassRemindersUseCase } from './send-live-class-reminders.use-case';
import {
  DueLiveClassReminder,
  LiveClassReminderGateway,
} from '../gateways/live-class-reminder.gateway';
import { NotificationGateway } from '../../notifications/gateways/notification.gateway';
import { EmailNotification } from '../../notifications/domain/email-content';

describe('SendLiveClassRemindersUseCase', () => {
  const now = new Date('2030-03-01T21:00:00Z');
  const reminder: DueLiveClassReminder = {
    email: 'ana@test.local',
    fullName: 'Ana María Pérez',
    courseId: 'c1',
    courseTitle: 'Manicura Rusa',
    lessonId: 'l1',
    lessonTitle: 'Sesión en vivo',
    startsAt: new Date('2030-03-01T22:00:00Z'),
  };

  let claimDue: jest.Mock;
  let sendEmail: jest.Mock<Promise<void>, [EmailNotification]>;
  let useCase: SendLiveClassRemindersUseCase;

  beforeEach(() => {
    claimDue = jest.fn().mockResolvedValue([reminder]);
    sendEmail = jest
      .fn<Promise<void>, [EmailNotification]>()
      .mockResolvedValue(undefined);
    useCase = new SendLiveClassRemindersUseCase(
      { claimDue } as unknown as LiveClassReminderGateway,
      { sendEmail } as unknown as NotificationGateway,
    );
  });

  it('pide los avisos que vencen dentro de la hora previa a la clase', async () => {
    await useCase.execute(now);
    expect(claimDue).toHaveBeenCalledWith(now, 60);
  });

  it('escribe a la alumna por su nombre, con el enlace directo a la clase', async () => {
    await expect(useCase.execute(now)).resolves.toBe(1);

    const email = sendEmail.mock.calls[0][0];
    expect(email.to).toBe('ana@test.local');
    expect(email.subject).toBe('Tu clase en vivo empieza en 1 hora');
    expect(email.content.body.toString()).toContain('Hola Ana:');
    expect(email.content.body.toString()).toContain('Sesión en vivo');
    expect(email.content.action).toEqual({
      label: 'Entrar a la clase',
      path: '/courses/c1/learn?leccion=l1',
    });
  });

  it('escapa el texto que viene de la base', async () => {
    claimDue.mockResolvedValue([
      { ...reminder, lessonTitle: '<script>x</script>' },
    ]);
    await useCase.execute(now);

    const body = sendEmail.mock.calls[0][0].content.body;
    expect(body.toString()).not.toContain('<script>');
  });

  it('sin clases próximas no envía nada', async () => {
    claimDue.mockResolvedValue([]);
    await expect(useCase.execute(now)).resolves.toBe(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

import { ConfigService } from '@nestjs/config';
import { RemindPendingCorrectionsUseCase } from './remind-pending-corrections.use-case';
import { PendingCorrectionsGateway } from '../gateways/pending-corrections.gateway';
import { AlertRecipientsGateway } from '../../users/gateways/alert-recipients.gateway';
import { NotificationGateway } from '../../notifications/gateways/notification.gateway';
import { EmailPriority } from '../../notifications/domain/email-priority';

describe('RemindPendingCorrectionsUseCase', () => {
  let countPending: jest.Mock;
  let findEmailsFor: jest.Mock;
  let sendEmail: jest.Mock;
  let useCase: RemindPendingCorrectionsUseCase;

  beforeEach(() => {
    countPending = jest.fn();
    findEmailsFor = jest.fn().mockResolvedValue(['profe@example.com']);
    sendEmail = jest.fn().mockResolvedValue(undefined);
    useCase = new RemindPendingCorrectionsUseCase(
      { countPending } as PendingCorrectionsGateway,
      { findEmailsFor } as AlertRecipientsGateway,
      { sendEmail } as NotificationGateway,
      {
        get: (_key: string, fallback: string) => fallback,
      } as unknown as ConfigService,
    );
  });

  it('no envía nada si no hay correcciones pendientes', async () => {
    countPending.mockResolvedValue(0);

    await useCase.execute();

    expect(findEmailsFor).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('avisa a cada destinataria con el total pendiente y prioridad baja', async () => {
    countPending.mockResolvedValue(3);

    await useCase.execute();

    expect(findEmailsFor).toHaveBeenCalledWith('pending_corrections');
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'profe@example.com',
        subject: 'Tienes 3 correcciones por revisar',
      }),
      EmailPriority.LOW,
    );
    const [message] = sendEmail.mock.calls[0] as [{ body: string }];
    expect(message.body).toContain('/admin/correcciones');
  });

  it('usa el singular cuando hay una sola', async () => {
    countPending.mockResolvedValue(1);

    await useCase.execute();

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ subject: 'Tienes 1 corrección por revisar' }),
      EmailPriority.LOW,
    );
  });

  it('no envía si nadie tiene los avisos activos', async () => {
    countPending.mockResolvedValue(2);
    findEmailsFor.mockResolvedValue([]);

    await useCase.execute();

    expect(sendEmail).not.toHaveBeenCalled();
  });
});

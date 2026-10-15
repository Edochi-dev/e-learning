import { RequestNameChangeUseCase } from './request-name-change.use-case';
import { NameChangeRequestGateway } from '../gateways/name-change-request.gateway';
import { UserGateway } from '../../users/gateways/user.gateway';
import { AlertRecipientsGateway } from '../../users/gateways/alert-recipients.gateway';
import { NotificationGateway } from '../../notifications/gateways/notification.gateway';
import { User } from '../../users/entities/user.entity';
import { NameChangeRequest } from '../entities/name-change-request.entity';

describe('RequestNameChangeUseCase', () => {
  const user = { id: 'u1', fullName: 'Ana Pérez' } as User;
  let findEmailsFor: jest.Mock;
  let sendEmail: jest.Mock;
  let create: jest.Mock;
  let useCase: RequestNameChangeUseCase;

  beforeEach(() => {
    findEmailsFor = jest.fn().mockResolvedValue(['admin@example.com']);
    sendEmail = jest.fn().mockResolvedValue(undefined);
    create = jest.fn().mockResolvedValue({ id: 'r1' } as NameChangeRequest);
    useCase = new RequestNameChangeUseCase(
      {
        findLatestByUser: jest.fn().mockResolvedValue(null),
        create,
      } as unknown as NameChangeRequestGateway,
      { findOne: jest.fn().mockResolvedValue(user) } as unknown as UserGateway,
      { sendEmail } as NotificationGateway,
      { findEmailsFor } as AlertRecipientsGateway,
    );
  });

  it('avisa solo a quien revisa solicitudes de cambio de nombre', async () => {
    await useCase.execute('u1', 'Ana María Pérez');

    expect(findEmailsFor).toHaveBeenCalledWith('name_change_requests');
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'admin@example.com' }),
    );
  });

  it('crea la solicitud aunque el aviso falle', async () => {
    findEmailsFor.mockRejectedValue(new Error('db down'));

    await expect(useCase.execute('u1', 'Ana María Pérez')).resolves.toEqual({
      id: 'r1',
    });
    expect(create).toHaveBeenCalled();
  });
});

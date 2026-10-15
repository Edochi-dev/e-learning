import { OutboxNotificationGateway } from './outbox-notification.gateway';
import { EmailPriority } from '../domain/email-priority';

describe('OutboxNotificationGateway', () => {
  const message = { to: 'ana@example.com', subject: 's', body: 'b' };
  let enqueue: jest.Mock;
  let gateway: OutboxNotificationGateway;

  beforeEach(() => {
    enqueue = jest.fn().mockResolvedValue(undefined);
    gateway = new OutboxNotificationGateway({ enqueue });
  });

  it('queues with NORMAL priority by default', async () => {
    await gateway.sendEmail(message);
    expect(enqueue).toHaveBeenCalledWith(message, EmailPriority.NORMAL);
  });

  it('queues with the requested priority', async () => {
    await gateway.sendEmail(message, EmailPriority.HIGH);
    expect(enqueue).toHaveBeenCalledWith(message, EmailPriority.HIGH);
  });

  it('fails when the email cannot be queued', async () => {
    enqueue.mockRejectedValueOnce(new Error('db down'));
    await expect(gateway.sendEmail(message)).rejects.toThrow('db down');
  });
});

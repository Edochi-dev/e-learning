import { OutboxNotificationGateway } from './outbox-notification.gateway';
import { EmailRenderer } from '../gateways/email-renderer.gateway';
import { EmailPriority } from '../domain/email-priority';
import { html } from '../templates/safe-html';

describe('OutboxNotificationGateway', () => {
  const notification = {
    to: 'ana@example.com',
    subject: 's',
    content: { heading: 'h', body: html`<p>b</p>` },
  };
  const rendered = { to: 'ana@example.com', subject: 's', body: '<html>' };
  let enqueue: jest.Mock;
  let render: jest.Mock;
  let gateway: OutboxNotificationGateway;

  beforeEach(() => {
    enqueue = jest.fn().mockResolvedValue(undefined);
    render = jest.fn().mockReturnValue(rendered);
    gateway = new OutboxNotificationGateway({ enqueue }, {
      render,
    } as EmailRenderer);
  });

  it('renders before queueing, with NORMAL priority by default', async () => {
    await gateway.sendEmail(notification);
    expect(render).toHaveBeenCalledWith(notification);
    expect(enqueue).toHaveBeenCalledWith(rendered, EmailPriority.NORMAL);
  });

  it('queues with the requested priority', async () => {
    await gateway.sendEmail(notification, EmailPriority.HIGH);
    expect(enqueue).toHaveBeenCalledWith(rendered, EmailPriority.HIGH);
  });

  it('fails when the email cannot be queued', async () => {
    enqueue.mockRejectedValueOnce(new Error('db down'));
    await expect(gateway.sendEmail(notification)).rejects.toThrow('db down');
  });
});

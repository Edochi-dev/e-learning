import { Logger } from '@nestjs/common';
import { DeliverDueEmailsUseCase } from './deliver-due-emails.use-case';
import { EmailOutboxQueue } from '../gateways/email-outbox-queue.gateway';
import { EmailTransport } from '../gateways/email-transport.gateway';
import { EmailRetryPolicy } from '../domain/email-retry-policy';
import { EmailOutboxMessage } from '../entities/email-outbox-message.entity';

describe('DeliverDueEmailsUseCase', () => {
  const policy = new EmailRetryPolicy(3, 60_000, 3_600_000);
  let claimDue: jest.Mock;
  let markSent: jest.Mock;
  let scheduleRetry: jest.Mock;
  let markFailed: jest.Mock;
  let deliver: jest.Mock;
  let useCase: DeliverDueEmailsUseCase;

  const row = (id: string, attempts = 1) =>
    ({
      id,
      recipient: `${id}@example.com`,
      subject: `subject ${id}`,
      body: `<p>${id}</p>`,
      attempts,
    }) as EmailOutboxMessage;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    claimDue = jest.fn().mockResolvedValue([]);
    markSent = jest.fn().mockResolvedValue(undefined);
    scheduleRetry = jest.fn().mockResolvedValue(undefined);
    markFailed = jest.fn().mockResolvedValue(undefined);
    deliver = jest.fn().mockResolvedValue({ provider: 'brevo' });
    useCase = new DeliverDueEmailsUseCase(
      {
        claimDue,
        markSent,
        scheduleRetry,
        markFailed,
      } as unknown as EmailOutboxQueue,
      { name: 'brevo > resend', deliver } as EmailTransport,
      policy,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 0 and sends nothing when no email is due', async () => {
    await expect(useCase.execute()).resolves.toBe(0);
    expect(claimDue).toHaveBeenCalledWith(10, expect.any(Date));
    expect(deliver).not.toHaveBeenCalled();
  });

  it('delivers each claimed email and records the provider', async () => {
    claimDue.mockResolvedValueOnce([row('a'), row('b')]);
    deliver
      .mockResolvedValueOnce({ provider: 'brevo' })
      .mockResolvedValueOnce({ provider: 'resend' });

    await expect(useCase.execute()).resolves.toBe(2);

    expect(deliver).toHaveBeenCalledWith({
      to: 'a@example.com',
      subject: 'subject a',
      body: '<p>a</p>',
    });
    expect(markSent).toHaveBeenCalledWith('a', 'brevo');
    expect(markSent).toHaveBeenCalledWith('b', 'resend');
  });

  it('schedules a backoff retry while attempts remain', async () => {
    claimDue.mockResolvedValueOnce([row('a', 2)]);
    deliver.mockRejectedValueOnce(new Error('all down'));
    const before = Date.now();

    await useCase.execute();

    expect(markSent).not.toHaveBeenCalled();
    const [id, nextAttemptAt, error] = scheduleRetry.mock.calls[0] as [
      string,
      Date,
      string,
    ];
    expect(id).toBe('a');
    expect(error).toBe('all down');
    expect(nextAttemptAt.getTime()).toBeGreaterThanOrEqual(
      before + policy.delayAfter(2),
    );
  });

  it('marks the email failed after the last allowed attempt', async () => {
    claimDue.mockResolvedValueOnce([row('a', 3)]);
    deliver.mockRejectedValueOnce(new Error('all down'));

    await useCase.execute();

    expect(scheduleRetry).not.toHaveBeenCalled();
    expect(markFailed).toHaveBeenCalledWith('a', 'all down');
  });

  it('does not treat a failed bookkeeping write as a failed delivery', async () => {
    claimDue.mockResolvedValueOnce([row('a')]);
    markSent.mockRejectedValueOnce(new Error('db down'));

    await expect(useCase.execute()).rejects.toThrow('db down');
    expect(scheduleRetry).not.toHaveBeenCalled();
    expect(markFailed).not.toHaveBeenCalled();
  });

  it('keeps delivering the rest of the batch after one failure', async () => {
    claimDue.mockResolvedValueOnce([row('a'), row('b')]);
    deliver
      .mockRejectedValueOnce(new Error('rejected'))
      .mockResolvedValueOnce({ provider: 'brevo' });

    await useCase.execute();

    expect(scheduleRetry).toHaveBeenCalledTimes(1);
    expect(markSent).toHaveBeenCalledWith('b', 'brevo');
  });
});

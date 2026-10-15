import { Logger } from '@nestjs/common';
import { EmailOutboxWorker } from './email-outbox.worker';
import { EmailOutboxQueue } from './gateways/email-outbox-queue.gateway';
import { DeliverDueEmailsUseCase } from './use-cases/deliver-due-emails.use-case';

describe('EmailOutboxWorker', () => {
  let requeueInterrupted: jest.Mock;
  let execute: jest.Mock;
  let worker: EmailOutboxWorker;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    requeueInterrupted = jest.fn().mockResolvedValue(0);
    execute = jest.fn().mockResolvedValue(0);
    worker = new EmailOutboxWorker(
      { requeueInterrupted } as unknown as EmailOutboxQueue,
      { execute } as unknown as DeliverDueEmailsUseCase,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('requeues emails left in sending on startup', async () => {
    requeueInterrupted.mockResolvedValueOnce(2);
    await worker.onApplicationBootstrap();
    expect(requeueInterrupted).toHaveBeenCalled();
  });

  it('keeps delivering batches until nothing is due', async () => {
    execute
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(0);

    await worker.drainOutbox();
    expect(execute).toHaveBeenCalledTimes(3);
  });

  it('skips a tick while a previous one is still sending', async () => {
    let finish!: (claimed: number) => void;
    execute.mockReturnValueOnce(
      new Promise<number>((resolve) => (finish = resolve)),
    );

    const first = worker.drainOutbox();
    await worker.drainOutbox();
    expect(execute).toHaveBeenCalledTimes(1);

    finish(0);
    await first;
  });

  it('accepts new ticks again after a run that threw', async () => {
    execute.mockRejectedValueOnce(new Error('db down'));

    await expect(worker.drainOutbox()).rejects.toThrow('db down');
    await worker.drainOutbox();
    expect(execute).toHaveBeenCalledTimes(2);
  });
});

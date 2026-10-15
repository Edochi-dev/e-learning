import { Logger } from '@nestjs/common';
import { EmailMessage } from '../domain/email-message';
import {
  DeliveryReceipt,
  EmailTransport,
} from '../gateways/email-transport.gateway';

/**
 * Tries each transport in order and stops at the first that accepts the
 * email. It is itself an EmailTransport, so callers cannot tell one provider
 * from a chain of them.
 */
export class FailoverEmailTransport extends EmailTransport {
  readonly name: string;
  private readonly logger = new Logger(FailoverEmailTransport.name);

  constructor(private readonly chain: readonly EmailTransport[]) {
    super();
    if (chain.length === 0) {
      throw new Error('FailoverEmailTransport needs at least one transport');
    }
    this.name = chain.map((transport) => transport.name).join(' > ');
  }

  async deliver(message: EmailMessage): Promise<DeliveryReceipt> {
    const failures: string[] = [];
    for (const transport of this.chain) {
      try {
        return await transport.deliver(message);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        failures.push(`${transport.name}: ${reason}`);
        this.logger.warn(`Envío por ${transport.name} falló: ${reason}`);
      }
    }
    throw new Error(`Todos los proveedores fallaron (${failures.join('; ')})`);
  }
}

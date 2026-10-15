import { Injectable } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { UserGateway } from '../gateways/user.gateway';
import { PasswordResetTokenGateway } from '../gateways/password-reset-token.gateway';
import { NotificationGateway } from '../../notifications/gateways/notification.gateway';
import { EmailPriority } from '../../notifications/domain/email-priority';
import { html } from '../../notifications/templates/safe-html';

// El token vive 1 hora. Suficiente para revisar el correo, corto para reducir
// la ventana de un enlace filtrado.
const TOKEN_TTL_MS = 60 * 60 * 1000;

/**
 * RequestPasswordResetUseCase — Paso 1 del "olvidé mi contraseña".
 *
 * Genera un token de un solo uso, guarda su HASH y envía por email el enlace
 * con el token EN CLARO (solo viaja en el correo, nunca se persiste así).
 *
 * ANTI-ENUMERACIÓN: si el email no existe, terminamos en silencio sin lanzar.
 * Así el endpoint responde igual exista o no la cuenta, y un atacante no puede
 * usarlo para descubrir qué correos están registrados.
 */
@Injectable()
export class RequestPasswordResetUseCase {
  constructor(
    private readonly userGateway: UserGateway,
    private readonly tokenGateway: PasswordResetTokenGateway,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async execute(email: string): Promise<void> {
    const user = await this.userGateway.findByEmail(email);
    if (!user) return; // silencio deliberado (ver nota arriba)

    // Un único token activo por usuario: invalidamos los anteriores.
    await this.tokenGateway.deleteByUserId(user.id);

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
    await this.tokenGateway.create({ userId: user.id, tokenHash, expiresAt });

    await this.notificationGateway.sendEmail(
      {
        to: user.email,
        subject: 'Restablece tu contraseña — Maris Nails Academy',
        content: {
          preheader:
            'El enlace para elegir una nueva contraseña vence en 1 hora.',
          heading: 'Restablece tu contraseña',
          body: html`<p>Hola ${user.fullName},</p>
            <p>
              Recibimos una solicitud para restablecer la contraseña de tu
              cuenta. Toca el botón para elegir una nueva. El enlace vence en 1
              hora.
            </p>`,
          action: {
            label: 'Elegir nueva contraseña',
            path: `/restablecer?token=${token}`,
          },
          footnote:
            'Si no fuiste tú, ignora este correo: tu contraseña seguirá igual.',
        },
      },
      EmailPriority.HIGH,
    );
  }
}

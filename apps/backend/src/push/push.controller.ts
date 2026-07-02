import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@maris-nails/shared';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PushSubscriptionGateway } from './gateways/push-subscription.gateway';
import { PushService } from './push.service';
import { SubscribeDto, UnsubscribeDto } from './dto/subscribe.dto';

/**
 * PushController — Suscripción a notificaciones web-push (solo ADMIN).
 *
 *   GET    /push/public-key  → clave VAPID pública para suscribirse
 *   POST   /push/subscribe   → guarda la suscripción del navegador
 *   DELETE /push/subscribe   → la elimina
 */
@Controller('push')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
export class PushController {
  constructor(
    private readonly gateway: PushSubscriptionGateway,
    private readonly pushService: PushService,
  ) {}

  @Get('public-key')
  publicKey(): { publicKey: string | null } {
    return { publicKey: this.pushService.getPublicKey() };
  }

  @Post('subscribe')
  @HttpCode(HttpStatus.NO_CONTENT)
  async subscribe(
    @Req() req: { user: { id: string } },
    @Body() dto: SubscribeDto,
  ): Promise<void> {
    await this.gateway.upsert({
      userId: req.user.id,
      endpoint: dto.endpoint,
      p256dh: dto.keys.p256dh,
      auth: dto.keys.auth,
    });
  }

  @Delete('subscribe')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unsubscribe(@Body() dto: UnsubscribeDto): Promise<void> {
    await this.gateway.deleteByEndpoint(dto.endpoint);
  }
}

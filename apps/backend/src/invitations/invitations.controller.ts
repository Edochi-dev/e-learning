import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { InvitationPreview, UserRole } from '@maris-nails/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { TokenGateway } from '../users/gateways/token.gateway';
import { User } from '../users/entities/user.entity';
import { CreateInvitationsDto } from './dto/create-invitations.dto';
import { RedeemInvitationDto } from './dto/redeem-invitation.dto';
import {
  CreateInvitationsUseCase,
  CreatedInvitation,
} from './use-cases/create-invitations.use-case';
import { GetInvitationPreviewUseCase } from './use-cases/get-invitation-preview.use-case';
import { RedeemInvitationUseCase } from './use-cases/redeem-invitation.use-case';
import { ClaimInvitationUseCase } from './use-cases/claim-invitation.use-case';
import { RevokeInvitationUseCase } from './use-cases/revoke-invitation.use-case';
import {
  ListCourseInvitationsUseCase,
  CourseInvitationRow,
} from './use-cases/list-course-invitations.use-case';

/** Misma cookie que el login: quien canjea queda con la sesión ya iniciada. */
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 1000,
};

@Controller('invitations')
export class InvitationsController {
  constructor(
    private readonly createInvitationsUseCase: CreateInvitationsUseCase,
    private readonly getInvitationPreviewUseCase: GetInvitationPreviewUseCase,
    private readonly redeemInvitationUseCase: RedeemInvitationUseCase,
    private readonly claimInvitationUseCase: ClaimInvitationUseCase,
    private readonly revokeInvitationUseCase: RevokeInvitationUseCase,
    private readonly listCourseInvitationsUseCase: ListCourseInvitationsUseCase,
    private readonly tokenGateway: TokenGateway,
  ) {}

  // ── Administración ─────────────────────────────────────────────────────
  // Declaradas ANTES que las rutas públicas: ':token' capturaría 'course'
  // como si fuera un token si estas vinieran después.

  @Post('course/:courseId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: CreateInvitationsDto,
    @Req() req: { user: { id: string } },
  ): Promise<CreatedInvitation[]> {
    // Los tokens en claro viajan SOLO en esta respuesta: no se guardan y no hay
    // forma de volver a consultarlos.
    return this.createInvitationsUseCase.execute(
      courseId,
      req.user.id,
      dto.labels.map((label) => label.trim() || null),
      dto.validityDays,
    );
  }

  @Get('course/:courseId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  async list(
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ): Promise<CourseInvitationRow[]> {
    return this.listCourseInvitationsUseCase.execute(courseId);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.revokeInvitationUseCase.execute(id);
  }

  // ── Públicas ───────────────────────────────────────────────────────────

  /**
   * GET /invitations/:token — Qué curso es y si el enlace sigue sirviendo.
   *
   * Solo lee. Es lo que permite abrir el enlace sin gastarlo.
   */
  @Get(':token')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  async preview(@Param('token') token: string): Promise<InvitationPreview> {
    return this.getInvitationPreviewUseCase.execute(token);
  }

  /**
   * POST /invitations/:token/redeem — Crear cuenta y entrar al curso.
   *
   * DEBE ser POST, y no por purismo REST: WhatsApp visita las URLs que se
   * comparten para generar la vista previa del enlace. Con un GET, el bot de
   * WhatsApp quemaría la invitación antes de que la alumna llegara a abrirla.
   */
  @Post(':token/redeem')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async redeem(
    @Param('token') token: string,
    @Body() dto: RedeemInvitationDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: User }> {
    const user = await this.redeemInvitationUseCase.execute({
      token,
      ...dto,
    });

    // Sesión iniciada al instante: obligarla a escribir otra vez la contraseña
    // que acaba de elegir sería fricción sin ninguna ganancia.
    const jwt = this.tokenGateway.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    });
    res.cookie('access_token', jwt, COOKIE_OPTIONS);

    return { user };
  }

  /** POST /invitations/:token/claim — Ya tiene cuenta: solo añade el curso. */
  @Post(':token/claim')
  @UseGuards(AuthGuard('jwt'), ThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async claim(
    @Param('token') token: string,
    @Req() req: { user: { id: string } },
  ): Promise<{ courseId: string }> {
    return this.claimInvitationUseCase.execute(token, req.user.id);
  }
}

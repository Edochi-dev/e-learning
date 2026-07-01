import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@maris-nails/shared';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequestNameChangeUseCase } from './use-cases/request-name-change.use-case';
import { GetMyNameChangeRequestUseCase } from './use-cases/get-my-name-change-request.use-case';
import { ListPendingNameChangeRequestsUseCase } from './use-cases/list-pending-name-change-requests.use-case';
import { ReviewNameChangeUseCase } from './use-cases/review-name-change.use-case';
import { RequestNameChangeDto } from './dto/request-name-change.dto';
import { ReviewNameChangeDto } from './dto/review-name-change.dto';
import { NameChangeRequest } from './entities/name-change-request.entity';

/**
 * NameChangeRequestsController — Endpoints del flujo de cambio de nombre.
 *
 * Rutas de alumno (JWT):
 *   POST /name-change-requests        → Solicitar un cambio
 *   GET  /name-change-requests/me     → Ver mi última solicitud (estado/cooldown)
 *
 * Rutas de admin (JWT + RolesGuard):
 *   GET   /name-change-requests/pending      → Cola de pendientes
 *   PATCH /name-change-requests/:id/review   → Aprobar o rechazar
 *
 * Las rutas estáticas ('me', 'pending') no chocan con :id porque el único
 * endpoint con parámetro es PATCH /:id/review.
 */
@Controller('name-change-requests')
@UseGuards(AuthGuard('jwt'))
export class NameChangeRequestsController {
  constructor(
    private readonly requestNameChangeUseCase: RequestNameChangeUseCase,
    private readonly getMyNameChangeRequestUseCase: GetMyNameChangeRequestUseCase,
    private readonly listPendingUseCase: ListPendingNameChangeRequestsUseCase,
    private readonly reviewNameChangeUseCase: ReviewNameChangeUseCase,
  ) {}

  // ── Alumno ──────────────────────────────────────────────────────────────

  @Post()
  async request(
    @Req() req: { user: { id: string } },
    @Body() dto: RequestNameChangeDto,
  ): Promise<NameChangeRequest> {
    return this.requestNameChangeUseCase.execute(
      req.user.id,
      dto.requestedName,
    );
  }

  @Get('me')
  async myLatest(
    @Req() req: { user: { id: string } },
  ): Promise<NameChangeRequest | null> {
    return this.getMyNameChangeRequestUseCase.execute(req.user.id);
  }

  // ── Admin ───────────────────────────────────────────────────────────────

  @Get('pending')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async pending(): Promise<NameChangeRequest[]> {
    return this.listPendingUseCase.execute();
  }

  @Patch(':id/review')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async review(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewNameChangeDto,
  ): Promise<NameChangeRequest> {
    return this.reviewNameChangeUseCase.execute(id, dto.action, dto.feedback);
  }
}

import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateOrderUseCase } from './use-cases/create-order.use-case';
import { GetMyOrdersUseCase } from './use-cases/get-my-orders.use-case';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './entities/order.entity';

/**
 * OrdersController — Endpoints HTTP del sistema de compras.
 *
 * Mismo patrón que EnrollmentsController:
 *   - Todas las rutas requieren JWT (AuthGuard a nivel de clase)
 *   - El userId se extrae del JWT, nunca del body
 *   - El Controller solo traduce HTTP ↔ Use Case, nunca tiene lógica de negocio
 *
 * Rutas:
 *   POST /orders/me  → Comprar un curso (crea orden + procesa pago + matricula)
 *   GET  /orders/me  → Ver mi historial de compras
 */
@Controller('orders')
@UseGuards(AuthGuard('jwt'))
export class OrdersController {
  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly getMyOrdersUseCase: GetMyOrdersUseCase,
  ) {}

  /**
   * POST /orders/me — Comprar un curso.
   *
   * El flujo completo (crear orden → pagar → matricular) lo maneja
   * el Use Case. El Controller solo pasa los datos y devuelve el resultado.
   *
   * Retorna la Order creada con su status final ('completed' o 'failed').
   * El frontend puede leer order.status para saber si mostrar un mensaje
   * de éxito o de error.
   */
  @Post('me')
  async createOrder(
    @Req() req: any,
    @Body() dto: CreateOrderDto,
  ): Promise<Order> {
    return this.createOrderUseCase.execute(req.user.id, dto.courseId);
  }

  /**
   * GET /orders/me — Historial de compras del usuario.
   *
   * Retorna las órdenes ordenadas de más reciente a más antigua,
   * con la relación course incluida para mostrar el título.
   */
  @Get('me')
  async getMyOrders(@Req() req: any): Promise<Order[]> {
    return this.getMyOrdersUseCase.execute(req.user.id);
  }
}

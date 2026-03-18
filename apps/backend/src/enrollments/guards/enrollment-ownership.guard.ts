import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EnrollmentGateway } from '../gateways/enrollment.gateway';

/**
 * EnrollmentOwnershipGuard — Verifica que la matrícula en la URL pertenece al usuario logueado.
 *
 * ¿Cuándo se necesita este Guard?
 *   Cuando una ruta recibe un :enrollmentId como parámetro de URL.
 *   Sin este guard, el usuario podría poner el ID de la matrícula de otra persona
 *   y acceder o borrar datos ajenos.
 *
 * ¿Por qué NO lo necesitamos en las rutas /me?
 *   Las rutas /me no reciben userId ni enrollmentId desde la URL.
 *   El userId siempre viene del JWT (verificado por AuthGuard), así que no hay
 *   nada que un usuario malicioso pueda manipular.
 *
 * Orden de guards en el controller (crítico):
 *   @UseGuards(AuthGuard('jwt'), EnrollmentOwnershipGuard)
 *                     ↑                        ↑
 *              Primero verifica            Luego verifica
 *              que hay JWT válido          que la matrícula es tuya
 *
 *   Si invirtieras el orden, intentarías leer req.user antes de que
 *   AuthGuard lo haya poblado → error de runtime.
 *
 * Optimización: adjuntamos la matrícula al request (request.enrollment)
 * para que el controlador no tenga que hacer una segunda consulta a la DB.
 */
@Injectable()
export class EnrollmentOwnershipGuard implements CanActivate {
  constructor(private readonly enrollmentGateway: EnrollmentGateway) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const enrollmentId: string = request.params.enrollmentId;
    const userId: string = request.user.id;

    const enrollment = await this.enrollmentGateway.findById(enrollmentId);
    if (!enrollment) {
      throw new NotFoundException('Matrícula no encontrada');
    }

    if (enrollment.userId !== userId) {
      throw new ForbiddenException(
        'No tienes permiso para acceder a esta matrícula',
      );
    }

    // Adjuntamos al request para evitar una segunda consulta en el controlador
    request.enrollment = enrollment;
    return true;
  }
}

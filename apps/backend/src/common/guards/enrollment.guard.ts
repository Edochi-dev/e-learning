import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ENROLLMENT_CHECK_KEY,
  EnrollmentCheckOptions,
} from '../decorators/enrollment-check.decorator';
import { Request } from 'express';
import { ApiErrorCode, UserRole } from '@maris-nails/shared';
import { EnrollmentGateway } from '../../enrollments/gateways/enrollment.gateway';
import { LessonGateway } from '../../courses/gateways/lesson.gateway';

/** Tipado del request tras pasar por AuthGuard('jwt'). */
interface AuthenticatedRequest extends Request {
  user: { id: string; role: string };
}

/**
 * EnrollmentGuard — Único punto que decide si alguien puede acceder al
 * contenido de un curso. Verifica dos cosas: que exista matrícula y que siga
 * vigente (Enrollment.isActive()).
 *
 * No dupliques esta comprobación dentro de un use case: si la regla vive en
 * varios sitios, tarde o temprano uno se queda atrás.
 *
 * IMPORTANTE: debe ir DESPUÉS de AuthGuard('jwt') en la cadena, porque necesita
 * el req.user que puebla la estrategia JWT.
 */
@Injectable()
export class EnrollmentGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly enrollmentGateway: EnrollmentGateway,
    private readonly lessonGateway: LessonGateway,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<EnrollmentCheckOptions>(
      ENROLLMENT_CHECK_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Sin decorador no hay nada que exigir (igual que RolesGuard sin @Roles).
    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId: string | undefined = request.user?.id;

    if (!userId) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    // El ADMIN no se matricula en sus propios cursos, pero necesita revisarlos.
    // Salimos antes de resolver el courseId para ahorrar la consulta.
    if (request.user.role === UserRole.ADMIN) {
      return true;
    }

    const courseId = await this.resolveCourseId(request, options);

    const enrollment = await this.enrollmentGateway.findByUserAndCourse(
      userId,
      courseId,
    );

    if (!enrollment) {
      throw new ForbiddenException({
        message: 'No estás matriculada en este curso',
        code: ApiErrorCode.NOT_ENROLLED,
      });
    }

    // Vencida ≠ inexistente: el frontend ofrece renovar en un caso y comprar en
    // el otro, así que el motivo viaja en un código estable, no en el mensaje.
    if (!enrollment.isActive()) {
      throw new ForbiddenException({
        message: 'Tu acceso a este curso ha vencido',
        code: ApiErrorCode.ENROLLMENT_EXPIRED,
      });
    }

    return true;
  }

  /**
   * Resuelve el courseId según la estrategia del decorador.
   *
   * Dos caminos posibles:
   *   A) courseIdFrom → lee courseId directamente del body o params
   *   B) lessonIdFrom → lee lessonId, busca la lección, extrae courseId
   */
  private async resolveCourseId(
    request: AuthenticatedRequest,
    options: EnrollmentCheckOptions,
  ): Promise<string> {
    if (options.courseIdFrom) {
      const source = this.getSource(request, options.courseIdFrom);
      const courseId = source?.courseId;

      if (!courseId) {
        throw new BadRequestException(
          `courseId no encontrado en ${options.courseIdFrom}`,
        );
      }
      return courseId;
    }

    if (options.lessonIdFrom) {
      const field = options.lessonIdField ?? 'lessonId';
      const source = this.getSource(request, options.lessonIdFrom);
      const lessonId = source?.[field];

      if (!lessonId) {
        throw new BadRequestException(
          `${field} no encontrado en ${options.lessonIdFrom}`,
        );
      }

      const lesson = await this.lessonGateway.findLesson(lessonId);
      if (!lesson) {
        throw new NotFoundException('Lección no encontrada');
      }

      return lesson.courseId;
    }

    throw new BadRequestException(
      'EnrollmentCheck mal configurado: falta courseIdFrom o lessonIdFrom',
    );
  }

  /** Resuelve body, params o query como Record<string, string>. */
  private getSource(
    request: AuthenticatedRequest,
    from: 'body' | 'params' | 'query',
  ): Record<string, string> {
    if (from === 'body') return request.body as Record<string, string>;
    if (from === 'query') return request.query as Record<string, string>;
    return request.params as Record<string, string>;
  }
}

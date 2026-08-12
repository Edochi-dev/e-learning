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
import { UserRole } from '@maris-nails/shared';
import { EnrollmentGateway } from '../../enrollments/gateways/enrollment.gateway';
import { LessonGateway } from '../../courses/gateways/lesson.gateway';

/** Tipado del request tras pasar por AuthGuard('jwt'). */
interface AuthenticatedRequest extends Request {
  user: { id: string; role: string };
}

/**
 * EnrollmentGuard — Verifica que el usuario esté matriculado en el curso.
 *
 * Funciona igual que RolesGuard: lee metadata del decorador @EnrollmentCheck()
 * para saber DÓNDE buscar el courseId o lessonId en el request.
 *
 * Flujo:
 *   1. Lee la metadata del decorador (@EnrollmentCheck({ ... }))
 *   2. Extrae el courseId del request (directo o resuelto desde lessonId)
 *   3. Obtiene el userId del JWT (req.user.id)
 *   4. Consulta EnrollmentGateway.findByUserAndCourse()
 *   5. Si no hay enrollment → ForbiddenException (403)
 *
 * ¿Por qué un Guard y no un check dentro del Use Case?
 *   - Autorización ("¿PUEDES acceder?") es responsabilidad del Guard
 *   - Lógica de negocio ("¿QUÉ hacemos?") es responsabilidad del Use Case
 *   - Un Guard es reutilizable: lo aplicas con un decorador en cualquier endpoint
 *   - El Use Case queda más limpio y enfocado en su única responsabilidad
 *
 * ¿Por qué necesita inyectar gateways?
 *   Porque necesita hacer queries a la DB (verificar enrollment, resolver
 *   lessonId→courseId). NestJS permite inyección de dependencias en guards
 *   siempre que estén registrados como providers en el módulo.
 *
 * IMPORTANTE: este guard DEBE ir DESPUÉS de AuthGuard('jwt') en la cadena
 * de guards, porque necesita req.user (que lo pone el JWT strategy).
 */
@Injectable()
export class EnrollmentGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly enrollmentGateway: EnrollmentGateway,
    private readonly lessonGateway: LessonGateway,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Leer la metadata que puso @EnrollmentCheck()
    const options = this.reflector.getAllAndOverride<EnrollmentCheckOptions>(
      ENROLLMENT_CHECK_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si no hay decorator, el guard deja pasar (igual que RolesGuard sin @Roles)
    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId: string | undefined = request.user?.id;

    if (!userId) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    // 1.b El ADMIN administra la plataforma: no tiene por qué matricularse en
    // sus propios cursos para poder revisarlos. Sin esta excepción, la
    // profesora perdería la vista previa de sus propias lecciones (que hoy
    // pasa por el mismo endpoint que usa la alumna).
    //
    // Salimos ANTES de resolver el courseId a propósito: si el admin puede
    // pasar igual, consultar la lección en la DB sería trabajo desperdiciado.
    if (request.user.role === UserRole.ADMIN) {
      return true;
    }

    // 2. Resolver el courseId según la estrategia configurada
    const courseId = await this.resolveCourseId(request, options);

    // 3. Verificar enrollment
    const enrollment = await this.enrollmentGateway.findByUserAndCourse(
      userId,
      courseId,
    );

    if (!enrollment) {
      throw new ForbiddenException('No estás matriculada en este curso');
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
    // Camino A: courseId directo
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

    // Camino B: resolver desde lessonId
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

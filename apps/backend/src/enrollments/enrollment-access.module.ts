import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enrollment } from './entities/enrollment.entity';
import { EnrollmentGateway } from './gateways/enrollment.gateway';
import { EnrollmentsRepository } from './repositories/enrollments.repository';

/**
 * EnrollmentAccessModule — Expone SOLO la lectura/escritura de matrículas.
 *
 * Existe para romper un ciclo: EnrollmentGuard necesita EnrollmentGateway, y
 * también hace falta dentro de CoursesModule (endpoint de quiz). Como
 * EnrollmentsModule ya importa CoursesModule, importarlo de vuelta cerraría el
 * círculo y obligaría a forwardRef.
 *
 * Este módulo no depende de ningún otro módulo de negocio, así que cualquiera
 * puede importarlo sin arrastrar los use cases de matrículas.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Enrollment])],
  providers: [{ provide: EnrollmentGateway, useClass: EnrollmentsRepository }],
  exports: [EnrollmentGateway],
})
export class EnrollmentAccessModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnrollmentsController } from './enrollments.controller';
import { EnrollmentsRepository } from './enrollments.repository';
import { EnrollmentGateway } from './gateways/enrollment.gateway';
import { Enrollment } from './entities/enrollment.entity';
import { LessonProgress } from './entities/lesson-progress.entity';
import { EnrollInCourseUseCase } from './use-cases/enroll-in-course.use-case';
import { GetMyEnrollmentsUseCase } from './use-cases/get-my-enrollments.use-case';
import { MarkLessonCompleteUseCase } from './use-cases/mark-lesson-complete.use-case';
import { UnenrollUseCase } from './use-cases/unenroll.use-case';
import { EnrollmentOwnershipGuard } from './guards/enrollment-ownership.guard';
import { CoursesModule } from '../courses/courses.module';

/**
 * EnrollmentsModule — El "pegamento" del módulo de matrículas.
 *
 * imports:
 *   - TypeOrmModule.forFeature([Enrollment, LessonProgress])
 *       Registra las entidades para que TypeORM cree los repositorios
 *       que inyectamos con @InjectRepository() en EnrollmentsRepository.
 *
 *   - CoursesModule
 *       Lo importamos porque EnrollInCourseUseCase y MarkLessonCompleteUseCase
 *       necesitan inyectar CourseGateway (para verificar que el curso y la lección
 *       existen). CoursesModule debe exportar CourseGateway para que esto funcione.
 *
 * providers:
 *   - El binding { provide: EnrollmentGateway, useClass: EnrollmentsRepository }
 *       es la pieza clave de Clean Architecture: le decimos a NestJS que cuando
 *       alguien pida EnrollmentGateway (abstracción), entregue EnrollmentsRepository (concreto).
 *
 *   - EnrollmentOwnershipGuard se registra como provider porque necesita
 *       inyección de dependencias (necesita EnrollmentGateway).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Enrollment, LessonProgress]),
    CoursesModule,
  ],
  controllers: [EnrollmentsController],
  providers: [
    {
      provide: EnrollmentGateway,
      useClass: EnrollmentsRepository,
    },
    EnrollmentOwnershipGuard,
    EnrollInCourseUseCase,
    GetMyEnrollmentsUseCase,
    MarkLessonCompleteUseCase,
    UnenrollUseCase,
  ],
  // Exportamos EnrollmentGateway para que otros módulos (como OrdersModule)
  // puedan inyectarlo en sus Use Cases. Sin esto, NestJS lanza un error
  // de dependencia no resuelta porque el gateway solo es visible internamente.
  exports: [EnrollmentGateway],
})
export class EnrollmentsModule {}

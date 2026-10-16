import { Module } from '@nestjs/common';
import { CoursesModule } from '../courses/courses.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { EnrollmentAccessModule } from '../enrollments/enrollment-access.module';
import { CorrectionsModule } from '../corrections/corrections.module';
import { ProgressModule } from '../progress/progress.module';
import { EnrollmentGuard } from '../common/guards/enrollment.guard';
import { CourseOverviewController } from './course-overview.controller';
import { GetCourseOverviewUseCase } from './use-cases/get-course-overview.use-case';

/**
 * Portada del curso para la alumna. Módulo aparte porque combina progreso,
 * quizzes y correcciones, y CorrectionsModule ya depende de EnrollmentsModule:
 * dentro de cualquiera de ellos formaría un ciclo.
 */
@Module({
  imports: [
    CoursesModule,
    EnrollmentsModule,
    EnrollmentAccessModule,
    CorrectionsModule,
    ProgressModule,
  ],
  controllers: [CourseOverviewController],
  providers: [EnrollmentGuard, GetCourseOverviewUseCase],
})
export class CourseOverviewModule {}

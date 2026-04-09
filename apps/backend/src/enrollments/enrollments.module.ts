import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnrollmentsController } from './enrollments.controller';
import { EnrollmentGateway } from './gateways/enrollment.gateway';
import { QuizAttemptGateway } from './gateways/quiz-attempt.gateway';
import { EnrollmentsRepository } from './repositories/enrollments.repository';
import { QuizAttemptRepository } from './repositories/quiz-attempt.repository';
import { Enrollment } from './entities/enrollment.entity';
import { QuizAttempt } from './entities/quiz-attempt.entity';
import { QuizAttemptAnswer } from './entities/quiz-attempt-answer.entity';
import { EnrollInCourseUseCase } from './use-cases/enroll-in-course.use-case';
import { GetMyEnrollmentsUseCase } from './use-cases/get-my-enrollments.use-case';
import { MarkLessonCompleteUseCase } from './use-cases/mark-lesson-complete.use-case';
import { UnenrollUseCase } from './use-cases/unenroll.use-case';
import { SaveWatchProgressUseCase } from './use-cases/save-watch-progress.use-case';
import { GetCourseProgressUseCase } from './use-cases/get-course-progress.use-case';
import { SubmitQuizUseCase } from './use-cases/submit-quiz.use-case';
import { EnrollmentOwnershipGuard } from './guards/enrollment-ownership.guard';
import { CoursesModule } from '../courses/courses.module';
import { ProgressModule } from '../progress/progress.module';

/**
 * EnrollmentsModule — El "pegamento" del módulo de matrículas y progreso.
 *
 * Después de aplicar ISP, tenemos 4 gateways en lugar de 1 god-class:
 *
 *   | Abstracción              | Implementación             | Responsabilidad           |
 *   |--------------------------|----------------------------|---------------------------|
 *   | EnrollmentGateway        | EnrollmentsRepository      | Matrículas (CRUD)         |
 *   | LessonProgressGateway    | LessonProgressRepository   | Completar lecciones       |
 *   | WatchProgressGateway     | WatchProgressRepository    | Progreso de video         |
 *   | QuizAttemptGateway       | QuizAttemptRepository      | Intentos de exámenes      |
 *
 * Cada Use Case inyecta SOLO los gateways que necesita. Ejemplo:
 *   - SaveWatchProgressUseCase → EnrollmentGateway + WatchProgressGateway
 *   - No sabe que existen quizzes o compleción de lecciones.
 *
 * exports: EnrollmentGateway se exporta porque OrdersModule lo necesita
 * para crear matrículas automáticas tras un pago exitoso.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Enrollment, QuizAttempt, QuizAttemptAnswer]),
    CoursesModule,
    ProgressModule,
  ],
  controllers: [EnrollmentsController],
  providers: [
    // --- Bindings: abstracción → implementación concreta ---
    { provide: EnrollmentGateway, useClass: EnrollmentsRepository },
    { provide: QuizAttemptGateway, useClass: QuizAttemptRepository },
    // --- Guards ---
    EnrollmentOwnershipGuard,
    // --- Use Cases ---
    EnrollInCourseUseCase,
    GetMyEnrollmentsUseCase,
    MarkLessonCompleteUseCase,
    UnenrollUseCase,
    SaveWatchProgressUseCase,
    GetCourseProgressUseCase,
    SubmitQuizUseCase,
  ],
  // OrdersModule necesita EnrollmentGateway para matricular tras pago exitoso.
  exports: [EnrollmentGateway],
})
export class EnrollmentsModule {}

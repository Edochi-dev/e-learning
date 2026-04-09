import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LessonProgress } from './entities/lesson-progress.entity';
import { LessonProgressGateway } from './gateways/lesson-progress.gateway';
import { WatchProgressGateway } from './gateways/watch-progress.gateway';
import { LessonProgressRepository } from './repositories/lesson-progress.repository';
import { WatchProgressRepository } from './repositories/watch-progress.repository';

/**
 * ProgressModule — Módulo dedicado al progreso de estudiantes.
 *
 * ¿Por qué separarlo de EnrollmentsModule?
 *
 * Matrícula y progreso son dominios distintos con razones de cambio distintas:
 *   - Enrollment: "¿tiene acceso?" — administrativo, cambia con pagos/reembolsos.
 *   - Progress: "¿qué completó?" — tracking continuo, cambia con video watching,
 *     quiz completion, correction reviews, etc.
 *
 * Múltiples módulos necesitan registrar progreso:
 *   - EnrollmentsModule: MarkLessonCompleteUseCase, SubmitQuizUseCase
 *   - CorrectionsModule: ReviewCorrectionUseCase (marca lección completa al aprobar)
 *
 * Si el progreso viviera en enrollments, corrections tendría que importar
 * enrollments solo por el progreso — acoplamiento innecesario.
 *
 * Exporta ambos gateways para que cualquier módulo pueda:
 *   - LessonProgressGateway: marcar lecciones como completadas, consultar progreso
 *   - WatchProgressGateway: guardar/consultar porcentaje de video visto
 */
@Module({
  imports: [TypeOrmModule.forFeature([LessonProgress])],
  providers: [
    { provide: LessonProgressGateway, useClass: LessonProgressRepository },
    { provide: WatchProgressGateway, useClass: WatchProgressRepository },
  ],
  exports: [LessonProgressGateway, WatchProgressGateway],
})
export class ProgressModule {}

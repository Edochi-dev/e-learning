import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssignmentSubmission } from './entities/assignment-submission.entity';
import { CorrectionGateway } from './gateways/correction.gateway';
import { CorrectionsRepository } from './corrections.repository';
import { CoursesModule } from '../courses/courses.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../storage/storage.module';

/**
 * CorrectionsModule — Módulo de correcciones (entregas de tareas).
 *
 * Importa:
 *   - CoursesModule: para acceder a LessonGateway (verificar que la lección
 *     existe y es de tipo 'correction').
 *   - NotificationsModule: para notificar a la profesora cuando una alumna
 *     envía, y a la alumna cuando la profesora revisa.
 *   - StorageModule: para FileStorageGateway (guardar/borrar fotos de entregas).
 *
 * Los use cases se agregarán en Fase 5 (alumna) y Fase 6 (admin).
 * Por ahora solo está el wiring del gateway al repositorio.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([AssignmentSubmission]),
    CoursesModule,
    NotificationsModule,
    StorageModule,
  ],
  providers: [
    {
      provide: CorrectionGateway,
      useClass: CorrectionsRepository,
    },
  ],
  exports: [CorrectionGateway],
})
export class CorrectionsModule {}

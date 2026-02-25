import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoursesController } from './courses.controller';
import { FindAllCoursesUseCase } from './use-cases/find-all-courses.use-case';
import { FindOneCourseUseCase } from './use-cases/find-one-course.use-case';
import { CreateCourseUseCase } from './use-cases/create-course.use-case';
import { UpdateCourseUseCase } from './use-cases/update-course.use-case';
import { AddLessonUseCase } from './use-cases/add-lesson.use-case';
import { RemoveLessonUseCase } from './use-cases/remove-lesson.use-case';
import { UpdateLessonUseCase } from './use-cases/update-lesson.use-case';
import { ReorderLessonsUseCase } from './use-cases/reorder-lessons.use-case';
import { CourseGateway } from './gateways/course.gateway';
import { CoursesRepository } from './courses.repository';
import { Course } from './entities/course.entity';
import { Lesson } from './entities/lessons.entity';
import { StorageModule } from '../storage/storage.module';

/**
 * CoursesModule — El "pegamento" del módulo de cursos
 *
 * El Module en NestJS es quien "cablea" todo:
 * - imports: qué módulos externos necesitamos (TypeORM para DB, StorageModule para archivos)
 * - controllers: qué endpoints HTTP expone
 * - providers: qué servicios y use-cases están disponibles para inyección
 *
 * Nota cómo StorageModule se importa aquí. Gracias a que StorageModule
 * EXPORTA el FileStorageGateway, nuestro UpdateLessonUseCase puede
 * inyectarlo automáticamente sin configuración adicional.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Course, Lesson]),
    StorageModule, // Importamos para que FileStorageGateway esté disponible
  ],
  controllers: [CoursesController],
  providers: [
    FindAllCoursesUseCase,
    FindOneCourseUseCase,
    CreateCourseUseCase,
    UpdateCourseUseCase,
    AddLessonUseCase,
    RemoveLessonUseCase,
    UpdateLessonUseCase,
    ReorderLessonsUseCase,
    {
      provide: CourseGateway,
      useClass: CoursesRepository,
    },
  ],
})
export class CoursesModule { }

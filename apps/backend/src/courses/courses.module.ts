import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoursesController } from './courses.controller';
import { FindAllCoursesUseCase } from './use-cases/find-all-courses.use-case';
import { FindOneCourseUseCase } from './use-cases/find-one-course.use-case';
import { CreateCourseUseCase } from './use-cases/create-course.use-case';
import { UpdateCourseUseCase } from './use-cases/update-course.use-case';
import { AddLessonUseCase } from './use-cases/add-lesson.use-case';
import { RemoveLessonUseCase } from './use-cases/remove-lesson.use-case';
import { CourseGateway } from './gateways/course.gateway';
import { CoursesRepository } from './courses.repository';
import { Course } from './entities/course.entity';
import { Lesson } from './entities/lessons.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Course, Lesson])],
  controllers: [CoursesController],
  providers: [
    FindAllCoursesUseCase,
    FindOneCourseUseCase,
    CreateCourseUseCase,
    UpdateCourseUseCase,
    AddLessonUseCase,
    RemoveLessonUseCase,
    {
      provide: CourseGateway,
      useClass: CoursesRepository,
    },
  ],
})
export class CoursesModule { }

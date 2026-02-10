import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller';
import { FindAllCoursesUseCase } from './use-cases/find-all-courses.use-case';
import { FindOneCourseUseCase } from './use-cases/find-one-course.use-case';
import { CourseGateway } from './gateways/course.gateway';
import { InMemoryCourseGateway } from './gateways/in-memory-course.gateway';

@Module({
  controllers: [CoursesController],
  providers: [
    FindAllCoursesUseCase,
    FindOneCourseUseCase,
    {
      provide: CourseGateway,
      useClass: InMemoryCourseGateway,
    },
  ],
})
export class CoursesModule { }

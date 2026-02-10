import { Controller, Get, Param } from '@nestjs/common';
import type { Course } from '@maris-nails/shared';
import { FindAllCoursesUseCase } from './use-cases/find-all-courses.use-case';
import { FindOneCourseUseCase } from './use-cases/find-one-course.use-case';

@Controller('courses')
export class CoursesController {
  constructor(
    private readonly findAllUseCase: FindAllCoursesUseCase,
    private readonly findOneUseCase: FindOneCourseUseCase,
  ) { }

  @Get()
  findAll(): Course[] {
    return this.findAllUseCase.execute();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Course {
    return this.findOneUseCase.execute(id);
  }
}

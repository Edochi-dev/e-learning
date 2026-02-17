import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Course } from '@maris-nails/shared';
import { CreateCourseDto } from './dto/create-course.dto';
import { FindAllCoursesUseCase } from './use-cases/find-all-courses.use-case';
import { FindOneCourseUseCase } from './use-cases/find-one-course.use-case';
import { CreateCourseUseCase } from './use-cases/create-course.use-case';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('courses')
export class CoursesController {
  constructor(
    private readonly findAllCoursesUseCase: FindAllCoursesUseCase,
    private readonly findOneCourseUseCase: FindOneCourseUseCase,
    private readonly createCourseUseCase: CreateCourseUseCase,
  ) { }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() createCourseDto: CreateCourseDto): Promise<Course> {
    return this.createCourseUseCase.execute(createCourseDto);
  }

  @Get()
  async findAll(): Promise<Course[]> {
    return this.findAllCoursesUseCase.execute();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Course> {
    return this.findOneCourseUseCase.execute(id);
  }
}

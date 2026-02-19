import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Course, Lesson, UserRole } from '@maris-nails/shared';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { FindAllCoursesUseCase } from './use-cases/find-all-courses.use-case';
import { FindOneCourseUseCase } from './use-cases/find-one-course.use-case';
import { CreateCourseUseCase } from './use-cases/create-course.use-case';
import { UpdateCourseUseCase } from './use-cases/update-course.use-case';
import { AddLessonUseCase } from './use-cases/add-lesson.use-case';
import { RemoveLessonUseCase } from './use-cases/remove-lesson.use-case';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('courses')
export class CoursesController {
  constructor(
    private readonly findAllCoursesUseCase: FindAllCoursesUseCase,
    private readonly findOneCourseUseCase: FindOneCourseUseCase,
    private readonly createCourseUseCase: CreateCourseUseCase,
    private readonly updateCourseUseCase: UpdateCourseUseCase,
    private readonly addLessonUseCase: AddLessonUseCase,
    private readonly removeLessonUseCase: RemoveLessonUseCase,
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

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
  ): Promise<Course> {
    return this.updateCourseUseCase.execute(id, updateCourseDto);
  }

  @Post(':id/lessons')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  async addLesson(
    @Param('id') courseId: string,
    @Body() createLessonDto: CreateLessonDto,
  ): Promise<Lesson> {
    return this.addLessonUseCase.execute(courseId, createLessonDto);
  }

  @Delete(':courseId/lessons/:lessonId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  async removeLesson(@Param('lessonId') lessonId: string): Promise<void> {
    return this.removeLessonUseCase.execute(lessonId);
  }
}

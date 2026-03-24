import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  HttpCode,
  DefaultValuePipe,
  ParseIntPipe,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { Course, Lesson, UserRole } from '@maris-nails/shared';
import { PaginatedResult } from '../common/types/paginated-result.type';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { FindAllCoursesUseCase } from './use-cases/find-all-courses.use-case';
import { FindOneCourseUseCase } from './use-cases/find-one-course.use-case';
import { CreateCourseUseCase } from './use-cases/create-course.use-case';
import { UpdateCourseUseCase } from './use-cases/update-course.use-case';
import { AddLessonUseCase } from './use-cases/add-lesson.use-case';
import { RemoveLessonUseCase } from './use-cases/remove-lesson.use-case';
import { UpdateLessonUseCase } from './use-cases/update-lesson.use-case';
import { ReorderLessonsUseCase } from './use-cases/reorder-lessons.use-case';
import { DeleteCourseUseCase } from './use-cases/delete-course.use-case';
import { UpdateCourseThumbnailUseCase } from './use-cases/update-course-thumbnail.use-case';
import { DeleteCourseThumbnailUseCase } from './use-cases/delete-course-thumbnail.use-case';
import { ReorderLessonsDto } from './dto/reorder-lessons.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

/**
 * CoursesController — El punto de entrada HTTP
 *
 * Este archivo es el "adaptador" entre HTTP y la lógica de negocio.
 * Su trabajo es:
 * 1. Recibir requests HTTP (con decoradores como @Get, @Post, @Patch)
 * 2. Validar datos de entrada (con DTOs)
 * 3. Delegar al Use Case correspondiente
 * 4. Retornar la respuesta
 *
 * ¡Nota que NO hay lógica de negocio aquí! Solo recibe y delega.
 */
@Controller('courses')
export class CoursesController {
  constructor(
    private readonly findAllCoursesUseCase: FindAllCoursesUseCase,
    private readonly findOneCourseUseCase: FindOneCourseUseCase,
    private readonly createCourseUseCase: CreateCourseUseCase,
    private readonly updateCourseUseCase: UpdateCourseUseCase,
    private readonly addLessonUseCase: AddLessonUseCase,
    private readonly removeLessonUseCase: RemoveLessonUseCase,
    private readonly updateLessonUseCase: UpdateLessonUseCase,
    private readonly reorderLessonsUseCase: ReorderLessonsUseCase,
    private readonly deleteCourseUseCase: DeleteCourseUseCase,
    private readonly updateCourseThumbnailUseCase: UpdateCourseThumbnailUseCase,
    private readonly deleteCourseThumbnailUseCase: DeleteCourseThumbnailUseCase,
  ) {}

  // ==========================================
  // Endpoints de Cursos
  // ==========================================

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  // FileInterceptor('thumbnail') le dice a Multer que extraiga el campo 'thumbnail'
  // de la petición multipart/form-data. Sin esto, el archivo se ignoraría.
  @UseInterceptors(FileInterceptor('thumbnail'))
  async create(
    @Body() createCourseDto: CreateCourseDto,
    // ParseFilePipe valida el archivo ANTES de que llegue al use case.
    // fileIsRequired: false → el thumbnail es opcional (el admin puede no subir foto).
    // MaxFileSizeValidator → rechaza archivos > 5 MB con HTTP 400.
    // FileTypeValidator → rechaza cualquier MIME que no sea jpeg, png o webp.
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /image\/(jpeg|png|webp)/ }),
        ],
        fileIsRequired: false,
      }),
    )
    thumbnail?: Express.Multer.File,
  ): Promise<Course> {
    return this.createCourseUseCase.execute(createCourseDto, thumbnail);
  }

  @Get()
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(12), ParseIntPipe) limit: number,
  ): Promise<PaginatedResult<Course>> {
    if (limit > 100)
      throw new BadRequestException('El límite máximo es 100 por página');
    return this.findAllCoursesUseCase.execute(page, limit);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Course> {
    return this.findOneCourseUseCase.execute(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCourseDto: UpdateCourseDto,
  ): Promise<Course> {
    return this.updateCourseUseCase.execute(id, updateCourseDto);
  }

  /**
   * DELETE /courses/:id — Elimina un curso completo.
   *
   * @HttpCode(204): responde con HTTP 204 No Content en lugar del 200 por defecto.
   * El 204 es el código semánticamente correcto para DELETEs exitosos:
   * "La operación fue exitosa y no hay nada que devolver."
   * Retornar 200 con body vacío sería técnicamente incorrecto.
   */
  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.deleteCourseUseCase.execute(id);
  }

  // ==========================================
  // Endpoints de Miniatura del Curso
  // ==========================================

  /**
   * PATCH /courses/:id/thumbnail — Reemplaza la miniatura del curso.
   *
   * Ruta declarada ANTES de los endpoints de lecciones para que NestJS
   * no confunda "thumbnail" con un lessonId dinámico.
   * Recibe un archivo binario en el campo 'thumbnail' (multipart/form-data).
   */
  @Patch(':id/thumbnail')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('thumbnail'))
  async updateThumbnail(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /image\/(jpeg|png|webp)/ }),
        ],
        fileIsRequired: true,
      }),
    )
    thumbnail: Express.Multer.File,
  ): Promise<Course> {
    return this.updateCourseThumbnailUseCase.execute(id, thumbnail);
  }

  /**
   * DELETE /courses/:id/thumbnail — Elimina la miniatura del curso.
   * Borra el archivo del disco y limpia el campo thumbnailUrl en la BD.
   */
  @Delete(':id/thumbnail')
  @HttpCode(204)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  async deleteThumbnail(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.deleteCourseThumbnailUseCase.execute(id);
  }

  // ==========================================
  // Endpoints de Lecciones
  // ==========================================

  @Post(':id/lessons')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  async addLesson(
    @Param('id', ParseUUIDPipe) courseId: string,
    @Body() createLessonDto: CreateLessonDto,
  ): Promise<Lesson> {
    return this.addLessonUseCase.execute(courseId, createLessonDto);
  }

  /**
   * PATCH /courses/:courseId/lessons/reorder
   *
   * DEBE ir ANTES que /:lessonId. NestJS evalúa las rutas en orden de declaración:
   * si /:lessonId viniera primero, capturaría "reorder" como un UUID y fallaría.
   * Las rutas estáticas siempre deben declararse antes que las dinámicas del mismo nivel.
   */
  @Patch(':courseId/lessons/reorder')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  async reorderLessons(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: ReorderLessonsDto,
  ): Promise<void> {
    return this.reorderLessonsUseCase.execute(courseId, dto.lessonIds);
  }

  /**
   * PATCH /courses/:courseId/lessons/:lessonId
   *
   * Usamos PATCH (no PUT) porque estamos haciendo una actualización PARCIAL.
   * El admin puede enviar solo los campos que quiera cambiar.
   *
   * Protección:
   * - AuthGuard('jwt'): requiere token JWT válido → 401 si no hay token
   * - RolesGuard + @Roles(ADMIN): requiere rol admin → 403 si no es admin
   */
  @Patch(':courseId/lessons/:lessonId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateLesson(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() updateLessonDto: UpdateLessonDto,
  ): Promise<Lesson> {
    return this.updateLessonUseCase.execute(lessonId, updateLessonDto);
  }

  @Delete(':courseId/lessons/:lessonId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  async removeLesson(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ): Promise<void> {
    return this.removeLessonUseCase.execute(lessonId);
  }
}

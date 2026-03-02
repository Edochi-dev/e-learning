import {
    Controller,
    Post,
    Get,
    Delete,
    Body,
    Param,
    UseGuards,
    Req,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EnrollInCourseUseCase } from './use-cases/enroll-in-course.use-case';
import { GetMyEnrollmentsUseCase, EnrollmentWithProgress } from './use-cases/get-my-enrollments.use-case';
import { MarkLessonCompleteUseCase } from './use-cases/mark-lesson-complete.use-case';
import { UnenrollUseCase } from './use-cases/unenroll.use-case';
import { EnrollmentOwnershipGuard } from './guards/enrollment-ownership.guard';
import { EnrollInCourseDto } from './dto/enroll-in-course.dto';
import { MarkLessonCompleteDto } from './dto/mark-lesson-complete.dto';
import { Enrollment } from './entities/enrollment.entity';

/**
 * EnrollmentsController — Endpoints HTTP del sistema de matrículas.
 *
 * Patrón /me: el userId NUNCA viene de la URL. Siempre se extrae de req.user,
 * que fue poblado por AuthGuard('jwt') después de verificar el token.
 *
 * El @UseGuards(AuthGuard('jwt')) a nivel de clase protege TODAS las rutas.
 * No hace falta repetirlo en cada método.
 *
 * Rutas:
 *   POST   /enrollments/me             → Matricularse en un curso
 *   GET    /enrollments/me             → Ver mis cursos con progreso
 *   POST   /enrollments/me/progress    → Marcar lección como completada
 *   DELETE /enrollments/:enrollmentId  → Darse de baja (con OwnershipGuard)
 */
@Controller('enrollments')
@UseGuards(AuthGuard('jwt'))
export class EnrollmentsController {
    constructor(
        private readonly enrollInCourseUseCase: EnrollInCourseUseCase,
        private readonly getMyEnrollmentsUseCase: GetMyEnrollmentsUseCase,
        private readonly markLessonCompleteUseCase: MarkLessonCompleteUseCase,
        private readonly unenrollUseCase: UnenrollUseCase,
    ) {}

    @Post('me')
    async enroll(@Req() req: any, @Body() dto: EnrollInCourseDto): Promise<Enrollment> {
        return this.enrollInCourseUseCase.execute(req.user.id, dto.courseId);
    }

    @Get('me')
    async getMyEnrollments(@Req() req: any): Promise<EnrollmentWithProgress[]> {
        return this.getMyEnrollmentsUseCase.execute(req.user.id);
    }

    @Post('me/progress')
    @HttpCode(HttpStatus.NO_CONTENT)
    async markLessonComplete(@Req() req: any, @Body() dto: MarkLessonCompleteDto): Promise<void> {
        return this.markLessonCompleteUseCase.execute(req.user.id, dto.lessonId, dto.courseId);
    }

    /**
     * DELETE /enrollments/:enrollmentId — Darse de baja de un curso.
     *
     * Aquí sí aparece un :enrollmentId en la URL → necesitamos el OwnershipGuard.
     * El guard verifica que la matrícula pertenece al usuario del JWT.
     *
     * AuthGuard('jwt') va ANTES de EnrollmentOwnershipGuard porque:
     *   el OwnershipGuard necesita req.user.id, que solo existe
     *   después de que AuthGuard valide el token.
     */
    @Delete(':enrollmentId')
    @UseGuards(EnrollmentOwnershipGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    async unenroll(@Param('enrollmentId') enrollmentId: string): Promise<void> {
        return this.unenrollUseCase.execute(enrollmentId);
    }
}

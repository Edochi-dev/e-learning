import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { CourseOverview } from '@maris-nails/shared';
import { EnrollmentGuard } from '../common/guards/enrollment.guard';
import { EnrollmentCheck } from '../common/decorators/enrollment-check.decorator';
import { GetCourseOverviewUseCase } from './use-cases/get-course-overview.use-case';

@Controller('enrollments/me/courses')
@UseGuards(AuthGuard('jwt'))
export class CourseOverviewController {
  constructor(private readonly getCourseOverview: GetCourseOverviewUseCase) {}

  /** GET /enrollments/me/courses/:courseId/overview — para la portada del curso. */
  @Get(':courseId/overview')
  @UseGuards(EnrollmentGuard)
  @EnrollmentCheck({ courseIdFrom: 'params' })
  overview(
    @Req() req: { user: { id: string } },
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ): Promise<CourseOverview> {
    return this.getCourseOverview.execute(req.user.id, courseId);
  }
}

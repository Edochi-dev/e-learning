import { Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentGateway } from '../gateways/enrollment.gateway';

export interface CourseProgress {
  completedLessonIds: string[];
  watchProgress: Record<string, number>; // lessonId → percent visto
}

@Injectable()
export class GetCourseProgressUseCase {
  constructor(private readonly enrollmentGateway: EnrollmentGateway) {}

  async execute(userId: string, courseId: string): Promise<CourseProgress> {
    const enrollment = await this.enrollmentGateway.findByUserAndCourse(
      userId,
      courseId,
    );
    if (!enrollment) {
      throw new NotFoundException('No tienes matrícula activa en este curso');
    }

    const [completedLessonIds, watchProgress] = await Promise.all([
      this.enrollmentGateway.getCompletedLessonIds(userId, courseId),
      this.enrollmentGateway.getWatchProgressByCourse(userId, courseId),
    ]);

    return { completedLessonIds, watchProgress };
  }
}

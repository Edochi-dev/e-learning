import { Injectable, NotFoundException } from '@nestjs/common';
import { Lesson } from '../entities/lessons.entity';
import { CourseGateway } from '../gateways/course.gateway';
import { LessonGateway } from '../gateways/lesson.gateway';
import { CreateLessonDto } from '../dto/create-lesson.dto';
import { UpsertLiveClassEventUseCase } from '../../schedule/use-cases/upsert-live-class-event.use-case';

@Injectable()
export class AddLessonUseCase {
  constructor(
    private readonly courseGateway: CourseGateway,
    private readonly lessonGateway: LessonGateway,
    private readonly upsertLiveClassEvent: UpsertLiveClassEventUseCase,
  ) {}

  async execute(courseId: string, dto: CreateLessonDto): Promise<Lesson> {
    const course = await this.courseGateway.findOne(courseId);
    if (!course) {
      throw new NotFoundException(`Course with id ${courseId} not found`);
    }

    const lesson = await this.lessonGateway.addLesson(courseId, dto);

    // Clase en vivo con horario → crear su espejo en la agenda. Si el horario
    // choca con otro evento, revertimos la lección para no dejarla sin espejo.
    if (
      dto.type === 'class' &&
      dto.isLive &&
      dto.liveStartsAt &&
      dto.liveEndsAt
    ) {
      try {
        await this.upsertLiveClassEvent.execute(
          lesson.id,
          lesson.title,
          new Date(dto.liveStartsAt),
          new Date(dto.liveEndsAt),
        );
      } catch (err) {
        await this.lessonGateway.removeLesson(lesson.id);
        throw err;
      }
    }

    return lesson;
  }
}

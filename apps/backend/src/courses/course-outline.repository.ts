import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CourseOutlineGateway,
  LessonOutline,
} from './gateways/course-outline.gateway';
import { Lesson } from './entities/lessons.entity';

@Injectable()
export class CourseOutlineRepository implements CourseOutlineGateway {
  constructor(
    @InjectRepository(Lesson)
    private readonly lessons: Repository<Lesson>,
  ) {}

  findOutline(courseId: string): Promise<LessonOutline[]> {
    return this.lessons.find({
      select: { id: true, type: true },
      where: { courseId },
      order: { order: 'ASC' },
    });
  }
}

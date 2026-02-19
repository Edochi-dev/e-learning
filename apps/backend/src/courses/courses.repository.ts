import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseGateway } from './gateways/course.gateway';
import { Course } from './entities/course.entity';
import { Lesson } from './entities/lessons.entity';

@Injectable()
export class CoursesRepository implements CourseGateway {
    constructor(
        @InjectRepository(Course)
        private readonly courseRepository: Repository<Course>,
        @InjectRepository(Lesson)
        private readonly lessonRepository: Repository<Lesson>,
    ) { }

    async create(course: Course): Promise<Course> {
        const newCourse = this.courseRepository.create(course);
        return this.courseRepository.save(newCourse);
    }

    async findAll(): Promise<Course[]> {
        return this.courseRepository.find({ relations: ['lessons'] });
    }

    async findOne(id: string): Promise<Course | null> {
        return this.courseRepository.findOne({
            where: { id },
            relations: ['lessons'],
        });
    }

    async update(id: string, data: Partial<Course>): Promise<Course> {
        const course = await this.findOne(id);
        if (!course) {
            throw new NotFoundException(`Course with id ${id} not found`);
        }

        Object.assign(course, data);
        return this.courseRepository.save(course);
    }

    async addLesson(courseId: string, lessonData: Partial<Lesson>): Promise<Lesson> {
        const course = await this.findOne(courseId);
        if (!course) {
            throw new NotFoundException(`Course with id ${courseId} not found`);
        }

        const lesson = this.lessonRepository.create({
            ...lessonData,
            course,
        });
        return this.lessonRepository.save(lesson);
    }

    async removeLesson(lessonId: string): Promise<void> {
        const result = await this.lessonRepository.delete(lessonId);
        if (result.affected === 0) {
            throw new NotFoundException(`Lesson with id ${lessonId} not found`);
        }
    }
}

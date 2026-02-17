import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseGateway } from './gateways/course.gateway';
import { Course } from './entities/course.entity';

@Injectable()
export class CoursesRepository implements CourseGateway {
    constructor(
        @InjectRepository(Course)
        private readonly courseRepository: Repository<Course>,
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
}

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Lesson as ILesson } from '@maris-nails/shared';
import { Course } from './course.entity';

@Entity('lessons')
export class Lesson implements ILesson {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    title: string;

    @Column('text')
    description: string;

    @Column()
    duration: string;

    @Column()
    videoUrl: string;

    @ManyToOne(() => Course, (course) => course.lessons)
    course: Course;
}

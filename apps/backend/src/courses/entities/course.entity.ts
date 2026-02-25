import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Course as ICourse } from '@maris-nails/shared';
import { Lesson } from './lessons.entity';

@Entity('courses')
export class Course implements ICourse {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    title: string;

    @Column('decimal')
    price: number;

    @Column('text')
    description: string;

    @OneToMany(() => Lesson, (lesson) => lesson.course, { cascade: true })
    lessons: Lesson[];
}

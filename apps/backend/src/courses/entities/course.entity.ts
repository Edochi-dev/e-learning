import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Lesson } from './lessons.entity';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('decimal')
  price: number;

  @Column('text')
  description: string;

  // nullable: true porque los cursos viejos no tienen miniatura.
  // Sin esto, la migración fallaría al intentar agregar una columna NOT NULL
  // en una tabla que ya tiene filas.
  @Column({ nullable: true })
  thumbnailUrl: string;

  // 'simple-json' serializa el array como JSON string en una columna TEXT.
  // PostgreSQL no necesita una columna jsonb para un array simple de strings.
  @Column('simple-json', { nullable: true })
  features: string[];

  @OneToMany(() => Lesson, (lesson) => lesson.course, { cascade: true })
  lessons: Lesson[];
}

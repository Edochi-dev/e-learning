import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import type { CourseLevel } from '@maris-nails/shared';
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

  // Taxonomía para descubrimiento. Nullable: los cursos existentes no la tienen.
  // El tipo de columna es varchar EXPLÍCITO, así que TypeORM NO infiere el tipo
  // del metadata (evita el problema de los unions) — por eso es seguro tipar
  // `level` con el enum compartido CourseLevel (única fuente de valores).
  @Column({ type: 'varchar', nullable: true })
  category: string | null;

  @Column({ type: 'varchar', nullable: true })
  level: CourseLevel | null;

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

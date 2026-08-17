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

  // Días de acceso que otorga una matrícula nueva. null = acceso permanente
  // (valor de los cursos existentes, que se vendieron sin vencimiento).
  // Cambiarlo NO afecta a las matrículas ya emitidas: cada una congela su
  // propio expiresAt, igual que Order congela el precio.
  @Column({ type: 'int', nullable: true })
  accessDurationDays: number | null;

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

  /**
   * Fecha en que caduca una matrícula emitida en `from`, o null si el acceso es
   * permanente. Vive en el curso porque es el dueño de la duración: todo camino
   * que matricule (compra hoy, invitación mañana) debe derivar el vencimiento de
   * aquí en vez de recalcularlo.
   */
  accessExpiresAt(from: Date = new Date()): Date | null {
    if (!this.accessDurationDays) return null;

    const expiry = new Date(from);
    expiry.setDate(expiry.getDate() + this.accessDurationDays);
    return expiry;
  }
}

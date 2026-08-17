import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Course } from '../../courses/entities/course.entity';

/**
 * Enrollment — Tabla que registra qué usuarios están matriculados en qué cursos.
 *
 * Relaciones:
 *   - Un usuario puede estar matriculado en muchos cursos (ManyToOne → User)
 *   - Un curso puede tener muchos alumnos matriculados (ManyToOne → Course)
 *
 * El decorador @Unique(['userId', 'courseId']) crea una restricción en la DB
 * que impide que un usuario se matricule dos veces en el mismo curso.
 * Es más seguro que validarlo solo en código, porque la DB lo garantiza siempre.
 *
 * ¿Por qué tenemos TANTO @Column() userId COMO @ManyToOne ... user?
 *   - @Column() userId   → nos permite leer el ID directamente (ej: enrollment.userId)
 *                          sin necesidad de cargar toda la relación User desde la DB.
 *   - @ManyToOne ... user → nos permite hacer JOIN y cargar el objeto User completo
 *                          cuando lo necesitamos (ej: enrollment.user.fullName).
 *   TypeORM es listo: usa la MISMA columna "userId" para ambos. No se duplica.
 */
@Entity('enrollments')
@Unique('UQ_enrollments_userId_courseId', ['userId', 'courseId'])
export class Enrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Index('IDX_enrollment_courseId')
  @Column({ type: 'uuid' })
  courseId: string;

  @CreateDateColumn()
  enrolledAt: Date;

  // Momento en que caduca el acceso. null = permanente (todas las matrículas
  // anteriores a esta columna). Se congela al matricular a partir de
  // Course.accessDurationDays: cambiar la duración del curso después NO
  // recorta ni alarga un acceso ya vendido.
  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  /**
   * Única definición de "acceso vigente" del dominio. EnrollmentGuard la hace
   * cumplir en todos los endpoints de contenido; no dupliques esta regla.
   */
  isActive(now: Date = new Date()): boolean {
    if (!this.expiresAt) return true;
    return this.expiresAt.getTime() > now.getTime();
  }

  /**
   * Días que le quedan de acceso; null si es permanente, 0 si ya venció.
   *
   * Se calcula en el servidor y viaja resuelto al frontend: derivarlo allí con
   * el reloj del navegador mostraría días restantes a alguien a quien el
   * backend ya está rechazando.
   */
  daysRemaining(now: Date = new Date()): number | null {
    if (!this.expiresAt) return null;

    const remainingMs = this.expiresAt.getTime() - now.getTime();
    if (remainingMs <= 0) return 0;

    return Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
  }

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'FK_enrollments_userId',
  })
  user: User;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'courseId',
    foreignKeyConstraintName: 'FK_enrollments_courseId',
  })
  course: Course;
}

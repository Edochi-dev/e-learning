import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique } from 'typeorm';

/**
 * LessonProgress — Registra qué lecciones ha completado cada usuario.
 *
 * Granularidad: usuario + lección (no usuario + curso).
 * El progreso de un curso se CALCULA dividiendo lecciones completadas / total lecciones.
 * No lo guardamos como número porque cambiaría si el admin añade o elimina lecciones.
 *
 * @Unique(['userId', 'lessonId']) garantiza que una lección solo se puede
 * marcar como completa una vez por usuario. La operación es idempotente:
 * si el frontend llama dos veces por error, el resultado es el mismo.
 *
 * ¿Por qué NO tiene relación con Enrollment?
 *   Una lección pertenece a un curso. El curso tiene un enrollment.
 *   Podemos saber a qué curso pertenece una lección haciendo JOIN con la tabla lessons.
 *   Añadir enrollmentId aquí sería información redundante.
 */
@Entity('lesson_progress')
@Unique(['userId', 'lessonId'])
export class LessonProgress {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @Column()
    lessonId: string;

    @CreateDateColumn()
    completedAt: Date;
}

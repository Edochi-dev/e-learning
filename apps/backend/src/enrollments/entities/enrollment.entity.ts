import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Unique,
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
@Unique(['userId', 'courseId'])
export class Enrollment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @Column()
    courseId: string;

    @CreateDateColumn()
    enrolledAt: Date;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @ManyToOne(() => Course, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'courseId' })
    course: Course;
}

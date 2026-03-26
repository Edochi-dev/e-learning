import {
  Entity,
  PrimaryColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Lesson } from './lessons.entity';

/**
 * VideoLesson — Datos específicos de una lección tipo 'class' (video).
 *
 * Vive en su propia tabla `video_lessons`, separada de la tabla base `lessons`.
 * Esto es Joined Table Inheritance: la tabla padre tiene los datos comunes
 * (title, description, order) y la tabla hija solo tiene los datos del subtipo.
 *
 * ¿Por qué @PrimaryColumn y no @PrimaryGeneratedColumn?
 * Porque el ID de esta entidad es el MISMO que el de la lección padre.
 * No se genera uno nuevo — se reutiliza el UUID de `lessons.id`.
 * Eso hace que `lessonId` sea PK y FK al mismo tiempo.
 *
 * onDelete: 'CASCADE' → si se borra la lección padre, la fila hija
 * se borra automáticamente a nivel de base de datos.
 */
@Entity('video_lessons')
export class VideoLesson {
  @PrimaryColumn('uuid')
  lessonId: string;

  @Column()
  videoUrl: string;

  @Column({ nullable: true })
  duration: string;

  @Column({ default: false })
  isLive: boolean;

  @OneToOne(() => Lesson, (lesson) => lesson.videoData, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'lessonId' })
  lesson: Lesson;
}

import { Entity, PrimaryColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { LIVE_JOIN_LEAD_MINUTES } from '@maris-nails/shared';
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

  // Programación de la clase en vivo (obligatoria cuando isLive; null si no).
  // Es la fuente de verdad del horario; su espejo vive en schedule_events.
  @Column({ type: 'timestamptz', nullable: true })
  liveStartsAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  liveEndsAt: Date | null;

  /** A recorded video is always available; a live stream opens shortly before it starts. */
  isStreamOpenAt(now: Date): boolean {
    if (!this.isLive || !this.liveStartsAt) return true;
    const opensAt =
      new Date(this.liveStartsAt).getTime() - LIVE_JOIN_LEAD_MINUTES * 60_000;
    return now.getTime() >= opensAt;
  }

  @OneToOne(() => Lesson, (lesson) => lesson.videoData, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'lessonId' })
  lesson: Lesson;
}

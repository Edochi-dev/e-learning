import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * PushSubscription — Suscripción de un navegador a las notificaciones web-push.
 *
 * Cuando la admin activa los recordatorios desde su PWA, el navegador genera un
 * endpoint + claves (p256dh/auth). Guardamos eso para poder enviarle avisos.
 * `endpoint` es único: si el mismo navegador se vuelve a suscribir, se actualiza.
 */
@Entity('push_subscriptions')
export class PushSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Index({ unique: true })
  @Column()
  endpoint: string;

  @Column()
  p256dh: string;

  @Column()
  auth: string;

  @CreateDateColumn()
  createdAt: Date;
}

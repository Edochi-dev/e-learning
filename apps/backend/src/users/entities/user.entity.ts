import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserRole } from '@maris-nails/shared';
import { AlertTopic } from '../domain/alert-topic';

@Entity('users') // Esto le dice a TypeORM que cree una tabla llamada "users"
export class User {
  @PrimaryGeneratedColumn('uuid') // Un ID alfanumérico único, más seguro que 1, 2, 3...
  id: string;

  @Column({ unique: true }) // No pueden haber dos alumnos con el mismo correo
  email: string;

  @Column()
  fullName: string;

  @Exclude() // Nunca devolver este campo en las respuestas HTTP
  @Column()
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STUDENT, // Por defecto, el que se registre será estudiante
  })
  role: UserRole;

  // Email alert topics this admin handles (see AlertRecipientsGateway).
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  alertTopics: AlertTopic[];

  @CreateDateColumn() // Guarda automáticamente la fecha y hora en que se registró
  createdAt: Date;
}

import { User } from '../../users/entities/user.entity';
import { Enrollment } from '../../enrollments/entities/enrollment.entity';
import { NewEnrollment } from '../../enrollments/gateways/enrollment.gateway';

/**
 * Las tres operaciones de usuarios que el canje necesita, y ninguna más.
 *
 * Se declaran aquí, en el módulo que las consume, en vez de reutilizar
 * UserGateway entero: canjear no debe poder borrar usuarios ni cambiar
 * contraseñas, y un contrato que no ofrece esas operaciones lo hace imposible
 * en vez de solo desaconsejarlo.
 */
export interface TransactionalUsers {
  findByEmail(email: string): Promise<User | null>;
  create(user: User): Promise<User>;
}

export interface TransactionalEnrollments {
  findByUserAndCourse(
    userId: string,
    courseId: string,
  ): Promise<Enrollment | null>;
  enroll(data: NewEnrollment): Promise<Enrollment>;
  /** Renovar una matrícula vencida: crear otra violaría UNIQUE(user, course). */
  updateExpiry(id: string, expiresAt: Date | null): Promise<void>;
}

export interface TransactionalInvitations {
  /** Devuelve si ESTA llamada fue la que canjeó la invitación. */
  markRedeemed(id: string, userId: string, now: Date): Promise<boolean>;
}

/** Los repositorios del canje, todos ligados a la MISMA transacción. */
export interface InvitationTransaction {
  users: TransactionalUsers;
  enrollments: TransactionalEnrollments;
  invitations: TransactionalInvitations;
}

/**
 * InvitationUnitOfWork — Ejecuta el canje como una sola operación atómica.
 *
 * Canjear toca tres tablas: crea la cuenta, crea la matrícula y marca la
 * invitación como usada. Sin transacción, un fallo a mitad deja estados
 * imposibles: una alumna con cuenta y sin curso, o una invitación gastada que
 * no matriculó a nadie. Y ambos son de los que nadie detecta hasta que la
 * persona escribe por WhatsApp diciendo que no puede entrar.
 *
 * ¿Por qué vive en `invitations/` y no en `common/`?
 *   Un Unit of Work genérico tendría que conocer usuarios, matrículas,
 *   invitaciones y lo que venga después. Eso lo convertiría en un módulo del
 *   que dependería medio backend, invirtiendo la dirección de las
 *   dependencias: los módulos de negocio pasarían a depender de una pieza de
 *   infraestructura que los conoce a todos. Con alcance por feature, cada
 *   flujo declara exactamente lo que necesita y nadie más se entera.
 */
export abstract class InvitationUnitOfWork {
  abstract run<T>(work: (tx: InvitationTransaction) => Promise<T>): Promise<T>;
}

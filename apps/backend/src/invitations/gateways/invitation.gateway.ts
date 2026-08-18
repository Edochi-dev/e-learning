import { CourseInvitation } from '../entities/course-invitation.entity';

/** Datos con los que nace una invitación. El token en claro nunca se persiste. */
export interface NewInvitation {
  tokenHash: string;
  courseId: string;
  expiresAt: Date;
  createdByUserId: string;
  label: string | null;
}

/**
 * InvitationGateway — Acceso a datos de los enlaces de invitación.
 *
 * `markRedeemed` está aquí y no en un use case porque su garantía es de la base
 * de datos, no del código: ver su documentación.
 */
export abstract class InvitationGateway {
  /** Crea invitaciones en lote: la profesora reparte varias de una vez. */
  abstract createMany(data: NewInvitation[]): Promise<CourseInvitation[]>;

  abstract findByTokenHash(tokenHash: string): Promise<CourseInvitation | null>;

  /** Invitaciones de un curso, para el panel de la profesora. */
  abstract findByCourse(courseId: string): Promise<CourseInvitation[]>;

  abstract findById(id: string): Promise<CourseInvitation | null>;

  /** Anula un enlace repartido por error. */
  abstract revoke(id: string, now: Date): Promise<void>;

  /**
   * Marca la invitación como canjeada y devuelve si ESTA llamada fue la que la
   * canjeó.
   *
   * La condición `redeemedAt IS NULL` viaja dentro del propio UPDATE, así que
   * quien decide el ganador es PostgreSQL, no el código: de dos peticiones
   * simultáneas con el mismo enlace, una actualiza una fila y la otra actualiza
   * cero. Comprobar primero y escribir después dejaría una ventana entre ambas
   * cosas en la que las dos se creerían ganadoras.
   */
  abstract markRedeemed(
    id: string,
    userId: string,
    now: Date,
  ): Promise<boolean>;
}

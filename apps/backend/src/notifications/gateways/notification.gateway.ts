/**
 * EmailMessage — Forma mínima de un email saliente.
 *
 * Solo lleva los tres campos imprescindibles: a quién, asunto y cuerpo HTML.
 * No incluye `cc`, `bcc`, `attachments`, etc. — los agregaremos cuando un
 * caso de uso real los necesite (YAGNI). El contrato debe ser tan delgado
 * como sea posible para minimizar el acoplamiento entre el dominio que
 * notifica y la infraestructura que entrega.
 */
export interface EmailMessage {
  /** Email destinatario, ej: "ana@example.com" */
  to: string;
  /** Asunto del email, sin saltos de línea */
  subject: string;
  /** Cuerpo HTML del email */
  body: string;
}

/**
 * NotificationGateway — Contrato abstracto del puerto de notificaciones.
 *
 * Esta es una clase abstracta (no interfaz) por la misma razón de siempre:
 * NestJS necesita un token en runtime para resolver la inyección de
 * dependencias. Las interfaces de TypeScript se borran al compilar.
 *
 * Los módulos de dominio (corrections, certificates, etc.) inyectan ESTE
 * contrato y construyen sus propios mensajes en su propio idioma. Ninguno
 * de ellos sabe si el email termina yendo por SMTP, por consola en dev,
 * o mañana por una cola de mensajes — solo conocen el contrato.
 *
 * NotificationsModule decide en runtime qué adapter concreto inyectar
 * según las variables de entorno disponibles.
 */
export abstract class NotificationGateway {
  /**
   * Envía un email. Debe lanzar si la entrega falla, para que el caller
   * decida si propaga el error al usuario o lo loguea silenciosamente.
   *
   * Decisión: este método es síncrono respecto al envío real (no encola).
   * Si más adelante necesitamos asincronía con cola + worker, cambiaremos
   * el adapter — los callers no se enteran.
   */
  abstract sendEmail(message: EmailMessage): Promise<void>;
}

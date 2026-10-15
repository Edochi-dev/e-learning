/** A rendered email, as stored in the outbox and handed to a transport. */
export interface EmailMessage {
  to: string;
  /** Single line, no line breaks. */
  subject: string;
  /** Full HTML document. */
  body: string;
  /** text/plain alternative; improves deliverability and accessibility. */
  textBody?: string | null;
}

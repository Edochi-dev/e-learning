/** An outgoing email. Kept minimal on purpose: no cc, bcc or attachments yet. */
export interface EmailMessage {
  to: string;
  /** Single line, no line breaks. */
  subject: string;
  /** HTML body. */
  body: string;
}

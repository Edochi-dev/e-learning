import { SafeHtml } from '../templates/safe-html';

/**
 * What an email says, independent of how it looks. Use cases describe the
 * content; the EmailRenderer turns it into branded HTML and plain text.
 */
export interface EmailContent {
  /** Preview line shown next to the subject in the inbox. */
  preheader?: string;
  heading: string;
  /** Build with the `html` tag so interpolated values are escaped. */
  body: SafeHtml;
  /** Button to a page of the site; the renderer prefixes the site URL. */
  action?: { label: string; path: string };
  /** Small print under the button, e.g. "if this wasn't you…". */
  footnote?: string;
}

export interface EmailNotification {
  to: string;
  /** Single line, no line breaks. */
  subject: string;
  content: EmailContent;
}

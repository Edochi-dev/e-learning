import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { EmailRenderer } from '../gateways/email-renderer.gateway';
import { EmailContent, EmailNotification } from '../domain/email-content';
import { EmailMessage } from '../domain/email-message';
import { html, SafeHtml } from '../templates/safe-html';
import { fragmentToPlainText } from '../templates/plain-text';
import { BRAND_LOGO } from '../templates/brand-assets';

// Brand tokens from apps/frontend/src/App.css. Email clients ignore CSS
// variables, so the values are copied here; keep them in sync.
const COLOR = {
  bg: '#fdf8f5',
  card: '#ffffff',
  border: '#f3e6da',
  text: '#2d1b14',
  textSecondary: '#6b5347',
  textMuted: '#9c8578',
  primary: '#e84393',
  gold: '#CD9E55',
} as const;

const FONT = `'DM Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif`;
const BRAND_NAME = 'Maris Nails Academy';

/**
 * Wraps content in the site's look: gold monogram, cream background, white
 * card and a rose pill button, all centered (the emails are short). Table layout and inline styles on purpose —
 * that is what Gmail and Outlook render reliably.
 */
@Injectable()
export class BrandedEmailRenderer extends EmailRenderer {
  private readonly siteUrl: string;

  constructor(config: ConfigService) {
    super();
    this.siteUrl = config.get<string>('FRONTEND_URL', 'http://localhost:5173');
  }

  render({ to, subject, content }: EmailNotification): EmailMessage {
    return {
      to,
      subject,
      body: this.renderHtml(subject, content).value,
      textBody: this.renderText(content),
    };
  }

  private renderHtml(subject: string, content: EmailContent): SafeHtml {
    const siteLabel = this.siteUrl.replace(/^https?:\/\//, '');
    return html`<!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="color-scheme" content="light" />
          <meta name="supported-color-schemes" content="light" />
          <title>${subject}</title>
          <link
            href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&display=swap"
            rel="stylesheet"
          />
          <style>
            body {
              margin: 0;
              padding: 0;
              background: ${COLOR.bg};
            }
            .content p {
              margin: 0 0 16px;
            }
            .content strong {
              color: ${COLOR.text};
            }
            .content a {
              color: ${COLOR.primary};
            }
            @media (max-width: 600px) {
              .card {
                padding: 32px 24px !important;
              }
            }
          </style>
        </head>
        <body style="margin:0;padding:0;background:${COLOR.bg};">
          ${this.preheader(content.preheader)}
          <table
            role="presentation"
            width="100%"
            cellpadding="0"
            cellspacing="0"
            border="0"
            style="background:${COLOR.bg};"
          >
            <tr>
              <td align="center" style="padding:32px 16px;">
                <table
                  role="presentation"
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                  style="max-width:560px;"
                >
                  <tr>
                    <td align="center" style="padding:0 0 24px;">
                      <a href="${this.siteUrl}" style="text-decoration:none;">
                        <img
                          src="cid:${BRAND_LOGO.cid}"
                          width="96"
                          alt="${BRAND_NAME}"
                          style="display:block;width:96px;height:auto;border:0;"
                        />
                      </a>
                      <div
                        style="font-family:${FONT};font-size:12px;letter-spacing:3px;text-transform:uppercase;color:${COLOR.gold};padding-top:12px;"
                      >
                        ${BRAND_NAME}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td
                      class="card"
                      align="center"
                      style="text-align:center;background:${COLOR.card};border:1px solid ${COLOR.border};border-radius:20px;padding:40px 40px 32px;font-family:${FONT};color:${COLOR.textSecondary};font-size:16px;line-height:1.6;"
                    >
                      <h1
                        style="margin:0;font-family:${FONT};font-size:24px;line-height:1.3;font-weight:700;color:${COLOR.text};"
                      >
                        ${content.heading}
                      </h1>
                      <div
                        style="width:48px;height:3px;background:${COLOR.gold};border-radius:3px;margin:16px auto 24px;line-height:3px;font-size:0;"
                      >
                        &nbsp;
                      </div>
                      <div class="content">${content.body}</div>
                      ${this.button(content.action)}
                      ${this.footnote(content.footnote)}
                    </td>
                  </tr>
                  <tr>
                    <td
                      align="center"
                      style="padding:24px 16px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${COLOR.textMuted};"
                    >
                      Recibiste este correo por tu cuenta en ${BRAND_NAME}.<br />
                      <a
                        href="${this.siteUrl}"
                        style="color:${COLOR.gold};text-decoration:none;"
                        >${siteLabel}</a
                      >
                      ${this.uniqueMarker()}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>`;
  }

  // Gmail threads same-subject emails and hides any trailing block identical to
  // an earlier message ("Mostrar texto citado"); a hidden unique id stops it.
  // Matters for the twice-daily reminder, whose subject often repeats.
  private uniqueMarker(): SafeHtml {
    return html`<span
      style="display:none;font-size:0;line-height:0;max-height:0;overflow:hidden;opacity:0;"
      >${randomUUID()}</span
    >`;
  }

  // Hidden text that inbox lists show as the preview line.
  private preheader(text?: string): SafeHtml {
    if (!text) return html``;
    return html`<div
      style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;"
    >
      ${text}
    </div>`;
  }

  // Table-based "bulletproof" button: a styled <a> alone breaks in Outlook.
  private button(action?: EmailContent['action']): SafeHtml {
    if (!action) return html``;
    return html`<table
      role="presentation"
      cellpadding="0"
      cellspacing="0"
      border="0"
      align="center"
      style="margin:8px auto 24px;"
    >
      <tr>
        <td
          align="center"
          bgcolor="${COLOR.primary}"
          style="border-radius:999px;"
        >
          <a
            href="${this.siteUrl + action.path}"
            style="display:inline-block;padding:14px 32px;font-family:${FONT};font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;"
            >${action.label}</a
          >
        </td>
      </tr>
    </table>`;
  }

  private footnote(text?: string): SafeHtml {
    if (!text) return html``;
    return html`<p
      style="margin:0;padding-top:16px;border-top:1px solid ${COLOR.border};font-size:13px;line-height:1.5;color:${COLOR.textMuted};"
    >
      ${text}
    </p>`;
  }

  private renderText(content: EmailContent): string {
    const parts = [content.heading, fragmentToPlainText(content.body.value)];
    if (content.action) {
      parts.push(
        `${content.action.label}: ${this.siteUrl}${content.action.path}`,
      );
    }
    if (content.footnote) parts.push(content.footnote);
    parts.push(`— ${BRAND_NAME}\n${this.siteUrl}`);
    return parts.join('\n\n');
  }
}

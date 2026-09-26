import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface SendResult {
  delivered: boolean;
}

/**
 * Transactional email through the Resend HTTP API.
 *
 * Delivery is optional by design: without RESEND_API_KEY the message is
 * logged instead of sent, so local development and the test suite never
 * depend on an external service. Tokens are only logged outside production.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  get configured() {
    return Boolean(this.config.get<string>("RESEND_API_KEY")?.trim());
  }

  private origin() {
    return this.config.get<string>("CORS_ORIGIN") ?? "http://127.0.0.1:3000";
  }

  private async send(
    to: string,
    subject: string,
    html: string,
    fallbackDetail: string,
  ): Promise<SendResult> {
    const apiKey = this.config.get<string>("RESEND_API_KEY")?.trim();
    if (!apiKey) {
      const showDetail = this.config.get<string>("NODE_ENV") !== "production";
      this.logger.warn(
        `Email delivery is not configured. "${subject}" for ${to} was not sent.${
          showDetail ? ` ${fallbackDetail}` : ""
        }`,
      );
      return { delivered: false };
    }
    const from =
      this.config.get<string>("RESEND_EMAIL_FROM")?.trim() ||
      "SmartCare <onboarding@resend.dev>";
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to, subject, html }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        this.logger.error(`Resend rejected an email with status ${response.status}`);
        return { delivered: false };
      }
      return { delivered: true };
    } catch {
      // A mail outage must never fail registration or a reset request.
      this.logger.error("Could not reach the Resend API");
      return { delivered: false };
    }
  }

  private layout(heading: string, body: string, link: string, label: string) {
    return `<div style="font-family:system-ui,sans-serif;line-height:1.5">
<h1 style="font-size:20px">${heading}</h1>
<p>${body}</p>
<p><a href="${link}" style="display:inline-block;padding:10px 16px;background:#0f766e;color:#fff;border-radius:6px;text-decoration:none">${label}</a></p>
<p style="color:#64748b;font-size:13px">If the button does not work, copy this address into your browser:<br />${link}</p>
<p style="color:#64748b;font-size:13px">This is an automated message. Please do not reply.</p>
</div>`;
  }

  sendEmailVerification(to: string, token: string) {
    const link = `${this.origin()}/verify-email?token=${encodeURIComponent(token)}`;
    return this.send(
      to,
      "Confirm your SmartCare email address",
      this.layout(
        "Confirm your email address",
        "Use the button below to confirm this address for your SmartCare account.",
        link,
        "Confirm email address",
      ),
      `Verification link: ${link}`,
    );
  }

  sendPasswordReset(to: string, token: string) {
    const link = `${this.origin()}/reset-password?token=${encodeURIComponent(token)}`;
    return this.send(
      to,
      "Reset your SmartCare password",
      this.layout(
        "Reset your password",
        "Someone requested a password reset for your SmartCare account. This link expires in one hour. If this was not you, you can ignore this message.",
        link,
        "Choose a new password",
      ),
      `Password reset link: ${link}`,
    );
  }
}

"use server";

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface EarlyAccessResult {
  success: boolean;
  error?: string;
}

export async function submitEarlyAccess(formData: FormData): Promise<EarlyAccessResult> {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const venueName = formData.get("venueName") as string;
  const city = formData.get("city") as string | null;
  const tableCount = formData.get("tableCount") as string | null;
  const message = formData.get("message") as string | null;

  // Validation
  if (!name || name.trim().length < 2) {
    return { success: false, error: "Please provide your name." };
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Please provide a valid email address." };
  }

  if (!venueName || venueName.trim().length < 2) {
    return { success: false, error: "Please provide your venue name." };
  }

  // Build email content
  const emailHtml = `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #2d2d2a; font-size: 24px; margin-bottom: 24px;">
        New Early Access Request
      </h1>

      <div style="background: #f9f8f6; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #4f4b45; font-size: 14px; width: 140px;">Name</td>
            <td style="padding: 8px 0; color: #2d2d2a; font-weight: 500;">${escapeHtml(name)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #4f4b45; font-size: 14px;">Email</td>
            <td style="padding: 8px 0; color: #2d2d2a; font-weight: 500;">
              <a href="mailto:${escapeHtml(email)}" style="color: #ea580c;">${escapeHtml(email)}</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #4f4b45; font-size: 14px;">Venue Name</td>
            <td style="padding: 8px 0; color: #2d2d2a; font-weight: 500;">${escapeHtml(venueName)}</td>
          </tr>
          ${city ? `
          <tr>
            <td style="padding: 8px 0; color: #4f4b45; font-size: 14px;">City</td>
            <td style="padding: 8px 0; color: #2d2d2a; font-weight: 500;">${escapeHtml(city)}</td>
          </tr>
          ` : ""}
          ${tableCount ? `
          <tr>
            <td style="padding: 8px 0; color: #4f4b45; font-size: 14px;">Table Count</td>
            <td style="padding: 8px 0; color: #2d2d2a; font-weight: 500;">${escapeHtml(tableCount)} tables</td>
          </tr>
          ` : ""}
        </table>
      </div>

      ${message ? `
      <div style="margin-bottom: 24px;">
        <h2 style="color: #4f4b45; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">
          Message
        </h2>
        <p style="color: #2d2d2a; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(message)}</p>
      </div>
      ` : ""}

      <div style="border-top: 1px solid #e5e4e2; padding-top: 16px; font-size: 12px; color: #4f4b45;">
        <p>This request was submitted via the GameLedger early access form.</p>
        <p>Reply directly to this email to respond to ${escapeHtml(name)}.</p>
      </div>
    </div>
  `;

  const emailText = `
New Early Access Request

Name: ${name}
Email: ${email}
Venue Name: ${venueName}
${city ? `City: ${city}` : ""}
${tableCount ? `Table Count: ${tableCount} tables` : ""}
${message ? `\nMessage:\n${message}` : ""}

---
This request was submitted via the GameLedger early access form.
Reply directly to this email to respond to ${name}.
  `.trim();

  try {
    const { error } = await resend.emails.send({
      from: "GameLedger <noreply@gameledger.io>",
      to: "faux.eric@gameledger.io",
      replyTo: email,
      subject: `New Early Access Request: ${venueName}`,
      html: emailHtml,
      text: emailText,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: "Failed to send request. Please try again." };
    }

    return { success: true };
  } catch (err) {
    console.error("Early access submission error:", err);
    return { success: false, error: "An unexpected error occurred. Please try again." };
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

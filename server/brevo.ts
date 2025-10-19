import * as brevo from "@getbrevo/brevo";

const apiInstance = new brevo.TransactionalEmailsApi();

if (!process.env.BREVO_API_KEY) {
  console.warn("BREVO_API_KEY not set. Password reset emails will not be sent.");
} else {
  apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);
}

export interface SendPasswordResetEmailParams {
  toEmail: string;
  toName: string;
  resetLink: string;
}

export async function sendPasswordResetEmail({
  toEmail,
  toName,
  resetLink,
}: SendPasswordResetEmailParams) {
  if (!process.env.BREVO_API_KEY) {
    console.error("Cannot send password reset email: BREVO_API_KEY not configured");
    throw new Error("Email service not configured");
  }

  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.subject = "Reset Your Password";
  sendSmtpEmail.sender = {
    name: "Mindbody Analytics",
    email: process.env.BREVO_SENDER_EMAIL || "noreply@yourdomain.com",
  };
  sendSmtpEmail.to = [{ email: toEmail, name: toName }];
  sendSmtpEmail.htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <tr>
                <td style="padding: 40px 40px 20px 40px;">
                  <h1 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 28px; font-weight: 600;">Reset Your Password</h1>
                  <p style="margin: 0 0 20px 0; color: #666; font-size: 16px; line-height: 1.5;">
                    Hello ${toName},
                  </p>
                  <p style="margin: 0 0 20px 0; color: #666; font-size: 16px; line-height: 1.5;">
                    We received a request to reset your password. Click the button below to create a new password:
                  </p>
                  <table cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                    <tr>
                      <td style="border-radius: 6px; background-color: #2563eb;">
                        <a href="${resetLink}" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 500;">Reset Password</a>
                      </td>
                    </tr>
                  </table>
                  <p style="margin: 0 0 20px 0; color: #666; font-size: 16px; line-height: 1.5;">
                    This link will expire in 1 hour for security reasons.
                  </p>
                  <p style="margin: 0 0 20px 0; color: #666; font-size: 16px; line-height: 1.5;">
                    If you didn't request a password reset, please ignore this email or contact support if you have concerns.
                  </p>
                  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
                  <p style="margin: 0; color: #999; font-size: 14px; line-height: 1.5;">
                    If the button above doesn't work, copy and paste this link into your browser:<br>
                    <a href="${resetLink}" style="color: #2563eb; word-break: break-all;">${resetLink}</a>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 40px 40px 40px; background-color: #f9f9f9;">
                  <p style="margin: 0; color: #999; font-size: 13px; text-align: center;">
                    © ${new Date().getFullYear()} Mindbody Analytics. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
  sendSmtpEmail.textContent = `
Hello ${toName},

We received a request to reset your password. Click the link below to create a new password:

${resetLink}

This link will expire in 1 hour for security reasons.

If you didn't request a password reset, please ignore this email or contact support if you have concerns.

© ${new Date().getFullYear()} Mindbody Analytics. All rights reserved.
  `.trim();

  try {
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log("Password reset email sent successfully");
    return result;
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw error;
  }
}

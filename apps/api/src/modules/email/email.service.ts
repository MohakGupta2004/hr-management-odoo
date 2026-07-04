import { Resend } from "resend";
import { config } from "../../config/config";

const resend = new Resend(config.resendApiKey);

export class EmailService {
  /**
   * Sends the verification email containing the link to the frontend route.
   * Flow: Link directs user to frontend `/verify?token=<token>`, which must call
   * backend GET `/auth/verify?token=<token>` to complete verification.
   */
  async sendVerificationEmail(toEmail: string, fullName: string, token: string): Promise<void> {
    const verificationLink = `${config.frontendUrl}/verify?token=${token}`;

    if (!config.resendApiKey || config.resendApiKey.startsWith("re_xxxx")) {
      console.warn("[Email Service] Resend API key is not configured or is a placeholder. Skipping email send.");
      console.log(`[Email Service] Mock Link: ${verificationLink}`);
      return;
    }

    await resend.emails.send({
      from: config.emailFrom,
      to: toEmail,
      subject: "Verify your email address",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #4f46e5; margin-bottom: 20px;">Welcome to HR Management!</h2>
          <p>Hello <strong>${fullName}</strong>,</p>
          <p>Thank you for registering your company. Please verify your email address to get started and set up your workspace.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 5px; display: inline-block;">Verify Email Address</a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #666;"><a href="${verificationLink}" style="color: #4f46e5;">${verificationLink}</a></p>
          <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 30px 0;" />
          <p style="font-size: 12px; color: #666;">This link will expire in 24 hours. If you did not register this account, please ignore this email.</p>
        </div>
      `,
    });
  }

  /**
   * Sends the welcome email containing the login ID and temporary password.
   */
  async sendWelcomeEmail(toEmail: string, fullName: string, loginId: string, temporaryPassword: string): Promise<void> {
    const loginLink = `${config.frontendUrl}/login`;

    if (!config.resendApiKey || config.resendApiKey.startsWith("re_xxxx")) {
      console.warn("[Email Service] Resend API key is not configured or is a placeholder. Skipping email send.");
      console.log(`[Email Service] Mock Login Details for ${fullName}: Login ID: ${loginId}, Password: ${temporaryPassword}`);
      return;
    }

    await resend.emails.send({
      from: config.emailFrom,
      to: toEmail,
      subject: "Welcome to HR Management - Your Login Details",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #4f46e5; margin-bottom: 20px;">Welcome, ${fullName}!</h2>
          <p>Your employee account has been created successfully. Below are your login credentials:</p>
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Login ID:</strong> ${loginId}</p>
            <p style="margin: 0;"><strong>Temporary Password:</strong> ${temporaryPassword}</p>
          </div>
          <p>You will be required to change your password upon your first login.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 5px; display: inline-block;">Login Now</a>
          </div>
        </div>
      `,
    });
  }
}

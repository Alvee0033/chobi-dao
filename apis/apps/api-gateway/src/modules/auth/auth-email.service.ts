import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { parseEnv } from "../../config/env";

@Injectable()
export class AuthEmailService {
  private readonly env = parseEnv();

  assertConfigured() {
    if (!this.env.RESEND_API_KEY || !this.env.AUTH_EMAIL_FROM) {
      throw new ServiceUnavailableException("Email verification is temporarily unavailable. Please try again later.");
    }
  }

  async sendVerificationCode(email: string, name: string | null, code: string) {
    this.assertConfigured();
    const greeting = name?.trim() ? `Hi ${name.trim()},` : "Hello,";
    const escapedGreeting = greeting.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[character]!);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.env.AUTH_EMAIL_FROM,
        to: [email],
        subject: "Your Chobi Dao verification code",
        text: `${greeting}\n\nYour Chobi Dao verification code is ${code}. It expires in 10 minutes. If you did not create this account, you can ignore this email.`,
        html: `<div style="margin:0;background:#faf5ed;padding:36px 16px;font-family:Arial,sans-serif;color:#38271e"><div style="max-width:480px;margin:auto;border:1px solid #eadbca;border-radius:18px;background:#fffdf9;padding:32px"><p style="margin:0 0 18px;color:#c55a2b;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase">CHOBI DAO</p><p style="margin:0 0 10px">${escapedGreeting}</p><h1 style="margin:0 0 12px;font-family:Georgia,serif;font-size:28px">Verify your email</h1><p style="margin:0 0 24px;color:#806b5b;line-height:1.6">Enter this code to finish creating your photographer account.</p><div style="border-radius:12px;background:#fff1e4;padding:18px;text-align:center;color:#b94c1e;font-size:32px;font-weight:bold;letter-spacing:9px">${code}</div><p style="margin:20px 0 0;color:#806b5b;font-size:13px">This code expires in 10 minutes. If you did not request it, you can ignore this email.</p></div></div>`,
      }),
    });
    if (!response.ok) {
      // Keep provider response bodies out of logs and client errors.
      throw new ServiceUnavailableException("We could not send your verification email. Please try again shortly.");
    }
  }
}

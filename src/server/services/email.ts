import nodemailer from "nodemailer";
import { logger } from "@/lib/logger";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporter;
}

export async function sendEmail(params: { to: string; subject: string; html: string; text?: string }) {
  const t = getTransporter();
  if (!t) {
    logger.info({ to: params.to, subject: params.subject }, "email skipped (SMTP_HOST not configured)");
    return { ok: false, reason: "smtp_not_configured" };
  }
  try {
    await t.sendMail({
      from: process.env.SMTP_FROM ?? "noreply@img-crm.local",
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text ?? params.html.replace(/<[^>]+>/g, ""),
    });
    return { ok: true };
  } catch (e: any) {
    logger.error({ err: e, to: params.to }, "email send failed");
    return { ok: false, reason: e.message };
  }
}

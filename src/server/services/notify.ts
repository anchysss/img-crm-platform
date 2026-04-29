import { prisma } from "@/lib/prisma";
import type { NotifikacijaTip } from "@prisma/client";
import { sendEmail } from "./email";

const APP_URL = process.env.NEXTAUTH_URL ?? "https://img-crm-platform.vercel.app";

/**
 * Kreira notifikaciju; idempotentno po (korisnikId, tip, linkUrl) za dati dan.
 * Opcionalno šalje email reminder ako korisnik ima email i SMTP je konfigurisan.
 */
export async function notify(params: {
  pravnoLiceId: string;
  korisnikId: string;
  tip: NotifikacijaTip;
  poruka: string;
  linkUrl?: string;
  email?: boolean; // default true
}) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const exists = await prisma.notifikacija.findFirst({
    where: {
      korisnikId: params.korisnikId,
      tip: params.tip,
      linkUrl: params.linkUrl ?? null,
      createdAt: { gte: startOfDay },
    },
  });
  if (exists) return exists;

  const created = await prisma.notifikacija.create({
    data: {
      pravnoLiceId: params.pravnoLiceId,
      korisnikId: params.korisnikId,
      tip: params.tip,
      poruka: params.poruka,
      linkUrl: params.linkUrl,
    },
  });

  // Email reminder (best-effort, ne blokira tok)
  if (params.email !== false) {
    const user = await prisma.korisnik.findUnique({ where: { id: params.korisnikId } });
    if (user?.email && user.aktivan) {
      const link = params.linkUrl ? `${APP_URL}${params.linkUrl}` : APP_URL;
      await sendEmail({
        to: user.email,
        subject: `[IMG CRM] ${params.tip}`,
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 20px;">
            <div style="background: #C70028; color: white; padding: 12px 16px; font-weight: bold;">IMG CRM</div>
            <div style="background: white; border: 1px solid #e5e7eb; padding: 20px;">
              <h2 style="margin: 0 0 10px; font-size: 16px;">${params.tip.replace(/_/g, " ")}</h2>
              <p style="margin: 0 0 16px; color: #374151;">${params.poruka}</p>
              <a href="${link}" style="display: inline-block; background: #C70028; color: white; padding: 10px 16px; text-decoration: none; border-radius: 4px;">Otvori u CRM-u</a>
            </div>
            <p style="font-size: 11px; color: #9ca3af; text-align: center; margin-top: 20px;">
              Ne odgovaraj na ovaj mail. <a href="${APP_URL}/profile">Prilagodi notifikacije</a>.
            </p>
          </div>
        `,
      });
    }
  }

  return created;
}

/** Broadcast svim korisnicima u tenant-u sa jednom ili više datih rola. */
export async function notifyRoles(params: {
  pravnoLiceId: string;
  rolaKodovi: string[];
  tip: NotifikacijaTip;
  poruka: string;
  linkUrl?: string;
}) {
  const korisnici = await prisma.korisnik.findMany({
    where: {
      deletedAt: null,
      aktivan: true,
      roles: { some: { pravnoLiceId: params.pravnoLiceId, rola: { kod: { in: params.rolaKodovi as any[] } } } },
    },
  });
  for (const k of korisnici) {
    await notify({ pravnoLiceId: params.pravnoLiceId, korisnikId: k.id, tip: params.tip, poruka: params.poruka, linkUrl: params.linkUrl });
  }
}

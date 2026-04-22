import { prisma } from "@/lib/prisma";
import type { NotifikacijaTip } from "@prisma/client";

/**
 * Kreira notifikaciju; idempotentno po (korisnikId, tip, linkUrl) za dati dan
 * (ne dupliraj istu notifikaciju više puta isti dan).
 */
export async function notify(params: {
  pravnoLiceId: string;
  korisnikId: string;
  tip: NotifikacijaTip;
  poruka: string;
  linkUrl?: string;
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
  return prisma.notifikacija.create({
    data: {
      pravnoLiceId: params.pravnoLiceId,
      korisnikId: params.korisnikId,
      tip: params.tip,
      poruka: params.poruka,
      linkUrl: params.linkUrl,
    },
  });
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

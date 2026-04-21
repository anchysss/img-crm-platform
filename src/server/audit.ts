import { AuditAkcija, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SessionCtx } from "./rbac";

export interface AuditEntry {
  ctx?: SessionCtx | null;
  pravnoLiceId?: string | null;
  entitet: string;
  entitetId: string;
  akcija: AuditAkcija;
  diff?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}

/** Zapisuje audit log. PZ 4.16 — append-only, nema delete/update. */
export async function audit(entry: AuditEntry) {
  await prisma.auditLog.create({
    data: {
      korisnikId: entry.ctx?.korisnikId ?? null,
      pravnoLiceId: entry.pravnoLiceId ?? entry.ctx?.tenantId ?? null,
      entitet: entry.entitet,
      entitetId: entry.entitetId,
      akcija: entry.akcija,
      diff: (entry.diff as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
      ip: entry.ip ?? undefined,
      userAgent: entry.userAgent ?? undefined,
    },
  });
}

/** Read log za PII-bearing entitete (Kontakt, Partner). PZ 4.15. */
export async function logPiiAccess(ctx: SessionCtx, subjektTip: string, subjektId: string, svrha: string) {
  await prisma.licniPodatakPristup.create({
    data: { korisnikId: ctx.korisnikId, subjektTip, subjektId, svrha },
  });
}

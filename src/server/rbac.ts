import { AkcijaDozvole, RolaKod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError } from "./errors";

export interface SessionCtx {
  korisnikId: string;
  email: string;
  tenantId: string; // trenutno aktivno PravnoLice (iz sesije ili header-a)
  roles: Array<{ rola: RolaKod; pravnoLiceId: string }>;
}

/**
 * Proverava da korisnik (u svojoj aktivnoj roli za dati tenant) ima dozvolu za (modul, akcija).
 * Baca FORBIDDEN ako ne. Čuva DB rezultat kroz in-memory cache po sesiji kroz request.
 */
export async function requirePermission(ctx: SessionCtx, modul: string, akcija: AkcijaDozvole, tenantId?: string) {
  const targetTenant = tenantId ?? ctx.tenantId;
  const rolesForTenant = ctx.roles.filter((r) => r.pravnoLiceId === targetTenant || r.rola === "ADMIN");
  if (rolesForTenant.length === 0) {
    throw new AppError("FORBIDDEN", `Nema pristupa tenant-u ${targetTenant}`);
  }
  const rolaKodovi = rolesForTenant.map((r) => r.rola);
  const dozvola = await prisma.dozvola.findFirst({
    where: {
      modul,
      akcija,
      rola: { kod: { in: rolaKodovi } },
    },
  });
  if (!dozvola) {
    throw new AppError("FORBIDDEN", `Nema dozvole ${modul}.${akcija}`);
  }
}

export function hasRole(ctx: SessionCtx, ...rolaKodovi: RolaKod[]) {
  return ctx.roles.some((r) => rolaKodovi.includes(r.rola));
}

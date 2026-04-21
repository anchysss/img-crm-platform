import { z } from "zod";
import { router, withPermission } from "../trpc";
import { prisma } from "@/lib/prisma";
import { AuditAkcija } from "@prisma/client";

export const auditRouter = router({
  list: withPermission("audit_log", "READ").input(
    z.object({
      entitet: z.string().optional(),
      akcija: z.nativeEnum(AuditAkcija).optional(),
      korisnikId: z.string().cuid().optional(),
      take: z.number().min(1).max(200).default(100),
    }).optional(),
  ).query(async ({ input }) => {
    return prisma.auditLog.findMany({
      where: {
        ...(input?.entitet ? { entitet: input.entitet } : {}),
        ...(input?.akcija ? { akcija: input.akcija } : {}),
        ...(input?.korisnikId ? { korisnikId: input.korisnikId } : {}),
      },
      include: { korisnik: true },
      orderBy: { timestamp: "desc" },
      take: input?.take ?? 100,
    });
  }),
});

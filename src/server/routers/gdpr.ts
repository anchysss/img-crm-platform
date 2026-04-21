import { z } from "zod";
import { router, withPermission } from "../trpc";
import { prisma } from "@/lib/prisma";
import { audit } from "../audit";

export const gdprRouter = router({
  rightToAccess: withPermission("gdpr_operations", "READ").input(z.object({ email: z.string().email() })).query(async ({ input, ctx }) => {
    const kontakti = await prisma.kontakt.findMany({ where: { email: input.email }, include: { partner: true } });
    const korisnici = await prisma.korisnik.findMany({ where: { email: input.email } });
    await audit({ ctx: ctx.session, entitet: "GDPR", entitetId: input.email, akcija: "GDPR_ACCESS" });
    return { kontakti, korisnici };
  }),

  rightToErasure: withPermission("gdpr_operations", "APPROVE").input(z.object({ kontaktId: z.string().cuid() })).mutation(async ({ input, ctx }) => {
    // Pseudonimizacija — audit trag operacije ostaje.
    const updated = await prisma.kontakt.update({
      where: { id: input.kontaktId },
      data: {
        ime: "[redacted]",
        email: null,
        telefon: null,
        pseudonimizovan: true,
        pseudonimizovanAt: new Date(),
      },
    });
    await audit({ ctx: ctx.session, entitet: "Kontakt", entitetId: input.kontaktId, akcija: "GDPR_ERASURE" });
    return updated;
  }),
});

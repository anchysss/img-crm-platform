import { z } from "zod";
import { router, withPermission } from "../trpc";
import { prisma } from "@/lib/prisma";
import { ensureTenant } from "../tenant";
import { audit, logPiiAccess } from "../audit";
import { AppError } from "../errors";
import { LegalBasis } from "@prisma/client";

const kontaktInput = z.object({
  partnerId: z.string().cuid(),
  ime: z.string().min(1),
  pozicija: z.string().optional(),
  email: z.string().email().optional(),
  telefon: z.string().optional(),
  primarni: z.boolean().default(false),
  legalBasis: z.nativeEnum(LegalBasis).default(LegalBasis.LEGITIMATE_INTEREST),
  izvor: z.string().optional(),
});

export const contactsRouter = router({
  listByPartner: withPermission("contacts", "READ").input(z.object({ partnerId: z.string().cuid() })).query(async ({ ctx, input }) => {
    const partner = await prisma.partner.findUnique({ where: { id: input.partnerId } });
    if (!partner) return [];
    ensureTenant(ctx.session!, partner.pravnoLiceId);
    await logPiiAccess(ctx.session!, "Partner", partner.id, "list_contacts");
    return prisma.kontakt.findMany({ where: { partnerId: input.partnerId, deletedAt: null } });
  }),

  create: withPermission("contacts", "CREATE").input(kontaktInput).mutation(async ({ input, ctx }) => {
    const partner = await prisma.partner.findUnique({ where: { id: input.partnerId } });
    if (!partner) throw new AppError("NOT_FOUND", "Partner ne postoji");
    ensureTenant(ctx.session!, partner.pravnoLiceId);

    if (input.primarni) {
      await prisma.kontakt.updateMany({ where: { partnerId: input.partnerId, primarni: true }, data: { primarni: false } });
    }
    const created = await prisma.kontakt.create({ data: input });
    await audit({ ctx: ctx.session, entitet: "Kontakt", entitetId: created.id, akcija: "CREATE", diff: { partnerId: input.partnerId } });
    return created;
  }),

  update: withPermission("contacts", "UPDATE").input(kontaktInput.partial().extend({ id: z.string().cuid() })).mutation(async ({ input, ctx }) => {
    const { id, ...rest } = input;
    const existing = await prisma.kontakt.findUnique({ where: { id }, include: { partner: true } });
    if (!existing) throw new AppError("NOT_FOUND", "Kontakt ne postoji");
    ensureTenant(ctx.session!, existing.partner.pravnoLiceId);
    if (rest.primarni) {
      await prisma.kontakt.updateMany({ where: { partnerId: existing.partnerId, primarni: true, NOT: { id } }, data: { primarni: false } });
    }
    const updated = await prisma.kontakt.update({ where: { id }, data: rest });
    await audit({ ctx: ctx.session, entitet: "Kontakt", entitetId: id, akcija: "UPDATE", diff: rest });
    return updated;
  }),
});

import { z } from "zod";
import { router, withPermission } from "../trpc";
import { prisma } from "@/lib/prisma";
import { ensureTenant } from "../tenant";
import { audit } from "../audit";
import { AppError } from "../errors";

export const resenjaRouter = router({
  byRadniNalog: withPermission("campaigns", "READ").input(
    z.object({ radniNalogId: z.string().cuid() }),
  ).query(async ({ ctx, input }) => {
    const rn = await prisma.radniNalog.findUnique({ where: { id: input.radniNalogId } });
    if (!rn) return [];
    ensureTenant(ctx.session!, rn.pravnoLiceId);
    return prisma.resenje.findMany({ where: { radniNalogId: input.radniNalogId }, orderBy: { oznaka: "asc" } });
  }),

  create: withPermission("campaigns", "CREATE").input(
    z.object({
      radniNalogId: z.string().cuid(),
      oznaka: z.string().min(1).max(20),
      naziv: z.string().optional(),
      procenat: z.coerce.number().min(0).max(100).default(100),
      napomena: z.string().optional(),
    }),
  ).mutation(async ({ ctx, input }) => {
    const rn = await prisma.radniNalog.findUnique({ where: { id: input.radniNalogId } });
    if (!rn) throw new AppError("NOT_FOUND", "Radni nalog ne postoji");
    ensureTenant(ctx.session!, rn.pravnoLiceId);
    const created = await prisma.resenje.create({
      data: {
        radniNalogId: input.radniNalogId,
        oznaka: input.oznaka,
        naziv: input.naziv,
        procenat: input.procenat,
        napomena: input.napomena,
      },
    });
    await audit({ ctx: ctx.session, entitet: "Resenje", entitetId: created.id, akcija: "CREATE", diff: { oznaka: input.oznaka } });
    return created;
  }),

  update: withPermission("campaigns", "UPDATE").input(
    z.object({
      id: z.string().cuid(),
      naziv: z.string().optional(),
      procenat: z.coerce.number().min(0).max(100).optional(),
      napomena: z.string().optional(),
    }),
  ).mutation(async ({ ctx, input }) => {
    const r = await prisma.resenje.findUnique({ where: { id: input.id }, include: { radniNalog: true } });
    if (!r) throw new AppError("NOT_FOUND", "Rešenje ne postoji");
    ensureTenant(ctx.session!, r.radniNalog.pravnoLiceId);
    const { id, ...rest } = input;
    return prisma.resenje.update({ where: { id }, data: rest });
  }),

  remove: withPermission("campaigns", "DELETE").input(
    z.object({ id: z.string().cuid() }),
  ).mutation(async ({ ctx, input }) => {
    const r = await prisma.resenje.findUnique({ where: { id: input.id }, include: { radniNalog: true } });
    if (!r) throw new AppError("NOT_FOUND", "Rešenje ne postoji");
    ensureTenant(ctx.session!, r.radniNalog.pravnoLiceId);
    await prisma.resenje.delete({ where: { id: input.id } });
    return { ok: true };
  }),
});

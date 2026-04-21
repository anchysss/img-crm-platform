import { z } from "zod";
import { router, withPermission } from "../trpc";
import { prisma } from "@/lib/prisma";
import { tenantWhere, ensureTenant } from "../tenant";
import { audit, logPiiAccess } from "../audit";
import { PartnerTip, PartnerStatus, Segment } from "@prisma/client";

const partnerInput = z.object({
  naziv: z.string().min(2).max(200),
  tip: z.nativeEnum(PartnerTip),
  segment: z.nativeEnum(Segment).default(Segment.C),
  status: z.nativeEnum(PartnerStatus).default(PartnerStatus.AKTIVAN),
  maticniBroj: z.string().optional(),
  pibVat: z.string().optional(),
  zemlja: z.string().length(2),
  adresa: z.string().optional(),
  grad: z.string().optional(),
  napomene: z.string().optional(),
  vlasnikId: z.string().cuid().optional(),
});

export const partnersRouter = router({
  list: withPermission("partners", "READ").input(
    z.object({
      q: z.string().optional(),
      tip: z.nativeEnum(PartnerTip).optional(),
      segment: z.nativeEnum(Segment).optional(),
      cursor: z.string().optional(),
      take: z.number().min(1).max(100).default(50),
    }).optional(),
  ).query(async ({ ctx, input }) => {
    const where = {
      ...tenantWhere(ctx.session!),
      ...(input?.q ? { naziv: { contains: input.q, mode: "insensitive" as const } } : {}),
      ...(input?.tip ? { tip: input.tip } : {}),
      ...(input?.segment ? { segment: input.segment } : {}),
      deletedAt: null,
    };
    return prisma.partner.findMany({
      where,
      take: input?.take ?? 50,
      ...(input?.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      orderBy: { naziv: "asc" },
    });
  }),

  byId: withPermission("partners", "READ").input(z.object({ id: z.string().cuid() })).query(async ({ ctx, input }) => {
    const p = await prisma.partner.findUnique({
      where: { id: input.id },
      include: { kontakti: true, aktivnosti: { take: 50, orderBy: { datum: "desc" } } },
    });
    if (!p) return null;
    ensureTenant(ctx.session!, p.pravnoLiceId);
    await logPiiAccess(ctx.session!, "Partner", p.id, "view_detail");
    return p;
  }),

  create: withPermission("partners", "CREATE").input(partnerInput).mutation(async ({ ctx, input }) => {
    const created = await prisma.partner.create({
      data: {
        ...input,
        pravnoLiceId: ctx.session!.tenantId,
        createdBy: ctx.session!.korisnikId,
      },
    });
    await audit({ ctx: ctx.session, entitet: "Partner", entitetId: created.id, akcija: "CREATE", diff: input });
    return created;
  }),

  update: withPermission("partners", "UPDATE").input(partnerInput.partial().extend({ id: z.string().cuid() })).mutation(async ({ ctx, input }) => {
    const { id, ...rest } = input;
    const existing = await prisma.partner.findUnique({ where: { id } });
    if (!existing) throw new Error("Partner ne postoji");
    ensureTenant(ctx.session!, existing.pravnoLiceId);
    const updated = await prisma.partner.update({
      where: { id },
      data: { ...rest, updatedBy: ctx.session!.korisnikId },
    });
    await audit({ ctx: ctx.session, entitet: "Partner", entitetId: id, akcija: "UPDATE", diff: rest });
    return updated;
  }),

  softDelete: withPermission("partners", "DELETE").input(z.object({ id: z.string().cuid() })).mutation(async ({ ctx, input }) => {
    const existing = await prisma.partner.findUnique({ where: { id: input.id } });
    if (!existing) return null;
    ensureTenant(ctx.session!, existing.pravnoLiceId);
    const updated = await prisma.partner.update({ where: { id: input.id }, data: { deletedAt: new Date() } });
    await audit({ ctx: ctx.session, entitet: "Partner", entitetId: input.id, akcija: "DELETE" });
    return updated;
  }),
});

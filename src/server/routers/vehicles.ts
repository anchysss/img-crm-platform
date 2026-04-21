import { z } from "zod";
import { router, withPermission } from "../trpc";
import { prisma } from "@/lib/prisma";
import { tenantWhere, ensureTenant } from "../tenant";
import { audit } from "../audit";
import { AppError } from "../errors";
import { VoziloTip, VoziloStatus, PozicijaTip } from "@prisma/client";

export const vehiclesRouter = router({
  list: withPermission("vehicles", "READ").input(
    z.object({ grad: z.string().optional(), tip: z.nativeEnum(VoziloTip).optional() }).optional(),
  ).query(async ({ ctx, input }) => {
    return prisma.vozilo.findMany({
      where: {
        ...tenantWhere(ctx.session!),
        deletedAt: null,
        ...(input?.grad ? { grad: input.grad } : {}),
        ...(input?.tip ? { tip: input.tip } : {}),
      },
      include: { pozicije: true },
      orderBy: { registracija: "asc" },
    });
  }),

  byId: withPermission("vehicles", "READ").input(z.object({ id: z.string().cuid() })).query(async ({ ctx, input }) => {
    const v = await prisma.vozilo.findUnique({
      where: { id: input.id },
      include: { pozicije: true, komunalneNaknade: { orderBy: { doDatum: "desc" } } },
    });
    if (!v) return null;
    ensureTenant(ctx.session!, v.pravnoLiceId);
    return v;
  }),

  create: withPermission("vehicles", "CREATE").input(
    z.object({
      registracija: z.string().min(1).max(20),
      tip: z.nativeEnum(VoziloTip),
      zemlja: z.string().length(2),
      grad: z.string().min(1),
      slikaUrl: z.string().url().optional(),
    }),
  ).mutation(async ({ input, ctx }) => {
    const created = await prisma.vozilo.create({
      data: { ...input, pravnoLiceId: ctx.session!.tenantId },
    });
    await audit({ ctx: ctx.session, entitet: "Vozilo", entitetId: created.id, akcija: "CREATE", diff: input });
    return created;
  }),

  updateStatus: withPermission("vehicles", "UPDATE").input(
    z.object({ id: z.string().cuid(), status: z.nativeEnum(VoziloStatus) }),
  ).mutation(async ({ input, ctx }) => {
    const existing = await prisma.vozilo.findUnique({ where: { id: input.id } });
    if (!existing) throw new AppError("NOT_FOUND", "Vozilo ne postoji");
    ensureTenant(ctx.session!, existing.pravnoLiceId);
    const updated = await prisma.vozilo.update({ where: { id: input.id }, data: { status: input.status } });
    await audit({ ctx: ctx.session, entitet: "Vozilo", entitetId: input.id, akcija: "UPDATE", diff: { status: input.status } });
    return updated;
  }),

  addPosition: withPermission("positions", "CREATE").input(
    z.object({
      voziloId: z.string().cuid(),
      tip: z.nativeEnum(PozicijaTip),
      dimenzije: z.string().optional(),
      minPeriodDana: z.number().min(1).default(7),
      cenaPoPeriodu: z.string(),
      valuta: z.string().length(3),
    }),
  ).mutation(async ({ input, ctx }) => {
    const v = await prisma.vozilo.findUnique({ where: { id: input.voziloId } });
    if (!v) throw new AppError("NOT_FOUND", "Vozilo ne postoji");
    ensureTenant(ctx.session!, v.pravnoLiceId);
    const created = await prisma.pozicija.create({ data: input });
    await audit({ ctx: ctx.session, entitet: "Pozicija", entitetId: created.id, akcija: "CREATE", diff: { voziloId: input.voziloId } });
    return created;
  }),

  addCommunalFee: withPermission("vehicles", "UPDATE").input(
    z.object({
      voziloId: z.string().cuid(),
      odDatum: z.coerce.date(),
      doDatum: z.coerce.date(),
      iznos: z.string(),
      valuta: z.string().length(3),
      napomena: z.string().optional(),
    }),
  ).mutation(async ({ input, ctx }) => {
    const created = await prisma.komunalnaNaknada.create({ data: input });
    await audit({ ctx: ctx.session, entitet: "KomunalnaNaknada", entitetId: created.id, akcija: "CREATE" });
    return created;
  }),
});

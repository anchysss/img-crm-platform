import { z } from "zod";
import { router, withPermission } from "../trpc";
import { prisma } from "@/lib/prisma";
import { tenantWhere, ensureTenant } from "../tenant";
import { audit } from "../audit";
import { AppError } from "../errors";
import { KampanjaStatus, RezervacijaStatus } from "@prisma/client";

export const campaignsRouter = router({
  list: withPermission("campaigns", "READ").input(
    z.object({ status: z.nativeEnum(KampanjaStatus).optional() }).optional(),
  ).query(async ({ ctx, input }) => {
    return prisma.kampanja.findMany({
      where: { ...tenantWhere(ctx.session!), deletedAt: null, ...(input?.status ? { status: input.status } : {}) },
      include: { partner: true, opportunity: true },
      orderBy: { odDatum: "desc" },
      take: 200,
    });
  }),

  byId: withPermission("campaigns", "READ").input(z.object({ id: z.string().cuid() })).query(async ({ ctx, input }) => {
    const k = await prisma.kampanja.findUnique({
      where: { id: input.id },
      include: {
        partner: true,
        stavke: { include: { pozicija: { include: { vozilo: true } } } },
        dokumenti: true,
      },
    });
    if (!k) return null;
    ensureTenant(ctx.session!, k.pravnoLiceId);
    return k;
  }),

  addItem: withPermission("campaigns", "UPDATE").input(
    z.object({
      kampanjaId: z.string().cuid(),
      pozicijaId: z.string().cuid(),
      odDatum: z.coerce.date(),
      doDatum: z.coerce.date(),
      cena: z.string(),
      valuta: z.string().length(3),
    }),
  ).mutation(async ({ input, ctx }) => {
    const k = await prisma.kampanja.findUnique({ where: { id: input.kampanjaId } });
    if (!k) throw new AppError("NOT_FOUND", "Kampanja ne postoji");
    ensureTenant(ctx.session!, k.pravnoLiceId);
    const conflict = await prisma.rezervacija.findFirst({
      where: {
        pozicijaId: input.pozicijaId,
        status: { in: [RezervacijaStatus.CONFIRMED, RezervacijaStatus.RUNNING, RezervacijaStatus.HOLD] },
        odDatum: { lte: input.doDatum },
        doDatum: { gte: input.odDatum },
        NOT: { kampanjaId: input.kampanjaId },
      },
    });
    if (conflict) throw new AppError("CONFLICT", "Pozicija je već rezervisana u tom periodu");
    const [stavka] = await prisma.$transaction([
      prisma.kampanjaStavka.create({ data: input }),
      prisma.rezervacija.create({
        data: {
          pozicijaId: input.pozicijaId,
          kampanjaId: input.kampanjaId,
          status: RezervacijaStatus.CONFIRMED,
          odDatum: input.odDatum,
          doDatum: input.doDatum,
        },
      }),
    ]);
    await audit({ ctx: ctx.session, entitet: "Kampanja", entitetId: input.kampanjaId, akcija: "UPDATE", diff: { added: input.pozicijaId } });
    return stavka;
  }),

  cancel: withPermission("campaigns", "UPDATE").input(z.object({ id: z.string().cuid(), razlog: z.string().min(5) })).mutation(async ({ input, ctx }) => {
    const k = await prisma.kampanja.findUnique({ where: { id: input.id } });
    if (!k) throw new AppError("NOT_FOUND", "Kampanja ne postoji");
    ensureTenant(ctx.session!, k.pravnoLiceId);
    if (k.status === KampanjaStatus.OTKAZANA) throw new AppError("CONFLICT", "Već otkazano");
    await prisma.$transaction([
      prisma.kampanja.update({ where: { id: input.id }, data: { status: KampanjaStatus.OTKAZANA, napomene: `Otkazano: ${input.razlog}` } }),
      prisma.rezervacija.updateMany({
        where: { kampanjaId: input.id, status: { in: [RezervacijaStatus.CONFIRMED, RezervacijaStatus.RUNNING] } },
        data: { status: RezervacijaStatus.CANCELLED },
      }),
    ]);
    await audit({ ctx: ctx.session, entitet: "Kampanja", entitetId: input.id, akcija: "UPDATE", diff: { cancelled: true, razlog: input.razlog } });
    return { ok: true };
  }),
});

import { z } from "zod";
import { router, withPermission } from "../trpc";
import { prisma } from "@/lib/prisma";
import { tenantWhere, ensureTenant } from "../tenant";
import { audit } from "../audit";
import { AppError } from "../errors";
import { PlanFakturisanjaStatus } from "@prisma/client";

export const planFakturisanjaRouter = router({
  list: withPermission("invoices", "READ").input(
    z.object({ status: z.nativeEnum(PlanFakturisanjaStatus).optional() }).optional(),
  ).query(async ({ ctx, input }) => {
    return prisma.planFakturisanja.findMany({
      where: { ...tenantWhere(ctx.session!), ...(input?.status ? { status: input.status } : {}) },
      include: { stavke: { orderBy: [{ godina: "asc" }, { mesec: "asc" }] } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }),

  byId: withPermission("invoices", "READ").input(z.object({ id: z.string().cuid() })).query(async ({ ctx, input }) => {
    const pl = await prisma.planFakturisanja.findUnique({
      where: { id: input.id },
      include: { stavke: { orderBy: [{ godina: "asc" }, { mesec: "asc" }] } },
    });
    if (!pl) return null;
    ensureTenant(ctx.session!, pl.pravnoLiceId);
    const [partner, vlasnik, opp] = await Promise.all([
      prisma.partner.findUnique({ where: { id: pl.partnerId } }),
      prisma.korisnik.findUnique({ where: { id: pl.vlasnikProdajaId } }),
      pl.opportunityId ? prisma.opportunity.findUnique({ where: { id: pl.opportunityId } }) : null,
    ]);
    return { ...pl, partner, vlasnik, opportunity: opp };
  }),

  setStatus: withPermission("invoices", "UPDATE").input(
    z.object({ id: z.string().cuid(), status: z.nativeEnum(PlanFakturisanjaStatus) }),
  ).mutation(async ({ ctx, input }) => {
    const pl = await prisma.planFakturisanja.findUnique({ where: { id: input.id } });
    if (!pl) throw new AppError("NOT_FOUND", "Plan fakturisanja ne postoji");
    ensureTenant(ctx.session!, pl.pravnoLiceId);
    const updated = await prisma.planFakturisanja.update({ where: { id: input.id }, data: { status: input.status } });
    await audit({ ctx: ctx.session, entitet: "PlanFakturisanja", entitetId: input.id, akcija: "UPDATE", diff: { status: input.status } });
    return updated;
  }),

  recalcSplit: withPermission("invoices", "UPDATE").input(
    z.object({ id: z.string().cuid(), kampanjaOd: z.coerce.date(), kampanjaDo: z.coerce.date() }),
  ).mutation(async ({ ctx, input }) => {
    const pl = await prisma.planFakturisanja.findUnique({ where: { id: input.id }, include: { stavke: true } });
    if (!pl) throw new AppError("NOT_FOUND", "Plan fakturisanja ne postoji");
    ensureTenant(ctx.session!, pl.pravnoLiceId);

    const totalDays = Math.max(1, Math.ceil((input.kampanjaDo.getTime() - input.kampanjaOd.getTime()) / 86400000) + 1);
    const ukupno = Number(pl.ukupno);
    const splits: Array<{ godina: number; mesec: number; iznos: number }> = [];
    let cursor = new Date(input.kampanjaOd);
    cursor.setHours(0, 0, 0, 0);
    while (cursor <= input.kampanjaDo) {
      const mesecEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
      const end = mesecEnd < input.kampanjaDo ? mesecEnd : input.kampanjaDo;
      const days = Math.ceil((end.getTime() - cursor.getTime()) / 86400000) + 1;
      splits.push({
        godina: cursor.getFullYear(),
        mesec: cursor.getMonth() + 1,
        iznos: Math.round((ukupno * days / totalDays) * 100) / 100,
      });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
    // rounding fix
    const sum = splits.reduce((a, s) => a + s.iznos, 0);
    const diff = Math.round((ukupno - sum) * 100) / 100;
    if (diff !== 0 && splits.length > 0) splits[splits.length - 1].iznos += diff;

    await prisma.$transaction([
      prisma.planFakturisanjaStavka.deleteMany({ where: { planId: pl.id } }),
      prisma.planFakturisanja.update({
        where: { id: pl.id },
        data: { kampanjaOd: input.kampanjaOd, kampanjaDo: input.kampanjaDo },
      }),
      ...splits.map((s) =>
        prisma.planFakturisanjaStavka.create({
          data: { planId: pl.id, godina: s.godina, mesec: s.mesec, iznos: String(s.iznos), valuta: pl.valuta },
        }),
      ),
    ]);
    await audit({ ctx: ctx.session, entitet: "PlanFakturisanja", entitetId: pl.id, akcija: "UPDATE", diff: { recalc: true, period: [input.kampanjaOd, input.kampanjaDo] } });
    return { ok: true };
  }),
});

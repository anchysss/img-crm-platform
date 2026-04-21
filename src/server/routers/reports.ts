import { z } from "zod";
import { router, withPermission } from "../trpc";
import { prisma } from "@/lib/prisma";
import { tenantWhere } from "../tenant";

export const reportsRouter = router({
  winRate: withPermission("reports", "READ").query(async ({ ctx }) => {
    const opps = await prisma.opportunity.findMany({
      where: { ...tenantWhere(ctx.session!), closedAt: { not: null } },
      include: { stage: true, partner: true },
    });
    const won = opps.filter((o) => o.stage.kod === "WON");
    const lost = opps.filter((o) => o.stage.kod === "LOST");
    const byPartnerType: Record<string, { won: number; lost: number }> = {};
    for (const o of opps) {
      const k = o.partner.tip;
      byPartnerType[k] ??= { won: 0, lost: 0 };
      if (o.stage.kod === "WON") byPartnerType[k].won++;
      if (o.stage.kod === "LOST") byPartnerType[k].lost++;
    }
    return {
      total: opps.length,
      won: won.length,
      lost: lost.length,
      winRate: opps.length ? Math.round((won.length / opps.length) * 100) : 0,
      byPartnerType,
    };
  }),

  inventoryUtilization: withPermission("reports", "READ").input(
    z.object({ from: z.coerce.date(), to: z.coerce.date() }),
  ).query(async ({ ctx, input }) => {
    const vozila = await prisma.vozilo.findMany({
      where: { ...tenantWhere(ctx.session!), deletedAt: null },
      include: { pozicije: { include: { rezervacije: { where: { odDatum: { lte: input.to }, doDatum: { gte: input.from } } } } } },
    });
    const totalDays = Math.max(1, Math.ceil((input.to.getTime() - input.from.getTime()) / (1000 * 60 * 60 * 24)));
    let totalSlots = 0;
    let busySlots = 0;
    for (const v of vozila) {
      for (const p of v.pozicije) {
        totalSlots += totalDays;
        for (const r of p.rezervacije) {
          if (["CONFIRMED", "RUNNING"].includes(r.status)) {
            const start = r.odDatum < input.from ? input.from : r.odDatum;
            const end = r.doDatum > input.to ? input.to : r.doDatum;
            busySlots += Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
          }
        }
      }
    }
    return {
      totalSlots,
      busySlots,
      utilization: totalSlots ? Math.round((busySlots / totalSlots) * 100) : 0,
    };
  }),

  topPartners: withPermission("reports", "READ").query(async ({ ctx }) => {
    const grouped = await prisma.dokument.groupBy({
      by: ["partnerId"],
      where: { ...tenantWhere(ctx.session!), tip: "FAKTURA" },
      _sum: { ukupno: true },
      orderBy: { _sum: { ukupno: "desc" } },
      take: 10,
    });
    const withNames = await Promise.all(
      grouped.map(async (g) => {
        const p = await prisma.partner.findUnique({ where: { id: g.partnerId } });
        return { partner: p?.naziv ?? "?", ukupno: g._sum.ukupno?.toString() ?? "0" };
      }),
    );
    return withNames;
  }),

  aging: withPermission("reports", "READ").query(async ({ ctx }) => {
    const fakture = await prisma.dokument.findMany({
      where: { ...tenantWhere(ctx.session!), tip: "FAKTURA", status: { in: ["OTVOREN", "DELIMICNO_PLACEN"] } },
    });
    const now = Date.now();
    const buckets = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
    for (const f of fakture) {
      const due = f.rokPlacanja ?? f.datum;
      const days = Math.ceil((now - due.getTime()) / (1000 * 60 * 60 * 24));
      const amount = Number(f.ukupno);
      if (days <= 30) buckets["0-30"] += amount;
      else if (days <= 60) buckets["31-60"] += amount;
      else if (days <= 90) buckets["61-90"] += amount;
      else buckets["90+"] += amount;
    }
    return buckets;
  }),
});

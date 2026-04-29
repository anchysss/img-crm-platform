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

  // Conversion funnel: count opportunities that passed through each stage
  conversionFunnel: withPermission("reports", "READ").query(async ({ ctx }) => {
    const opps = await prisma.opportunity.findMany({
      where: { ...tenantWhere(ctx.session!), deletedAt: null },
      include: { stage: true },
    });
    // Trenutni stage distribution
    const byStage: Record<string, number> = {};
    for (const o of opps) byStage[o.stage.kod] = (byStage[o.stage.kod] ?? 0) + 1;
    // Conversion estimates (based on current + historical won/lost)
    const orderedStages = ["LEAD", "CONTACTED", "NEW", "QUALIFIED", "PROPOSAL_SENT", "NEGOTIATION", "VERBALLY_CONFIRMED", "WON"];
    const cum: Record<string, number> = {};
    for (let i = orderedStages.length - 1; i >= 0; i--) {
      const kod = orderedStages[i];
      cum[kod] = (byStage[kod] ?? 0) + (i < orderedStages.length - 1 ? cum[orderedStages[i + 1]] : 0);
    }
    const conv = {
      leadToOffer: cum["PROPOSAL_SENT"] && cum["LEAD"] ? Math.round((cum["PROPOSAL_SENT"] / cum["LEAD"]) * 100) : 0,
      offerToNegotiation: cum["NEGOTIATION"] && cum["PROPOSAL_SENT"] ? Math.round((cum["NEGOTIATION"] / cum["PROPOSAL_SENT"]) * 100) : 0,
      negotiationToWon: cum["WON"] && cum["NEGOTIATION"] ? Math.round((cum["WON"] / cum["NEGOTIATION"]) * 100) : 0,
    };
    return { byStage, conversions: conv };
  }),

  // Time in stage — koliko dana opportunity stoji u trenutnoj fazi
  timeInStage: withPermission("reports", "READ").query(async ({ ctx }) => {
    const opps = await prisma.opportunity.findMany({
      where: { ...tenantWhere(ctx.session!), deletedAt: null, closedAt: null },
      include: { stage: true, partner: true, vlasnik: true },
    });
    const byStage: Record<string, { count: number; avgDani: number; overdue60: number }> = {};
    const rows: Array<{ id: string; naziv: string; partner: string; stage: string; vlasnik: string; daniUFazi: number }> = [];
    for (const o of opps) {
      const dani = Math.round((Date.now() - o.stageUpdatedAt.getTime()) / 86400000);
      const kod = o.stage.kod;
      byStage[kod] ??= { count: 0, avgDani: 0, overdue60: 0 };
      byStage[kod].count += 1;
      byStage[kod].avgDani += dani;
      if (dani > 60) byStage[kod].overdue60 += 1;
      if (dani > 60) rows.push({ id: o.id, naziv: o.naziv, partner: o.partner.naziv, stage: kod, vlasnik: `${o.vlasnik.ime} ${o.vlasnik.prezime}`, daniUFazi: dani });
    }
    for (const kod of Object.keys(byStage)) {
      byStage[kod].avgDani = byStage[kod].count > 0 ? Math.round(byStage[kod].avgDani / byStage[kod].count) : 0;
    }
    rows.sort((a, b) => b.daniUFazi - a.daniUFazi);
    return { byStage, overdue: rows.slice(0, 50) };
  }),

  // Lost reason analytics — breakdown i iznos po razlogu gubitka
  lostReasonAnalytics: withPermission("reports", "READ").query(async ({ ctx }) => {
    const opps = await prisma.opportunity.findMany({
      where: { ...tenantWhere(ctx.session!), stage: { kod: "LOST" } },
      include: { lostReason: true },
    });
    const grouped: Record<string, { count: number; vrednost: number }> = {};
    for (const o of opps) {
      const key = o.lostReason?.kod ?? "NEDEFINISANO";
      grouped[key] ??= { count: 0, vrednost: 0 };
      grouped[key].count += 1;
      grouped[key].vrednost += Number(o.expValue);
    }
    return grouped;
  }),

  // Cash flow projekcija iz PlanFakturisanja (mesečni aggregates)
  cashFlow: withPermission("reports", "READ").query(async ({ ctx }) => {
    const planovi = await prisma.planFakturisanja.findMany({
      where: { ...tenantWhere(ctx.session!), status: { not: "OTKAZAN" } },
      include: { stavke: true },
    });
    const byMonth: Record<string, { iznos: number; count: number; fakturisano: number }> = {};
    for (const p of planovi) {
      for (const s of p.stavke) {
        const key = `${s.godina}-${String(s.mesec).padStart(2, "0")}`;
        byMonth[key] ??= { iznos: 0, count: 0, fakturisano: 0 };
        byMonth[key].iznos += Number(s.iznos);
        byMonth[key].count += 1;
        if (s.fakturisano) byMonth[key].fakturisano += Number(s.iznos);
      }
    }
    return Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([period, v]) => ({ period, ...v }));
  }),

  // Reactivation lista — partneri koji nisu advertising ili su seasonal
  reactivationList: withPermission("partners", "READ").query(async ({ ctx }) => {
    return prisma.partner.findMany({
      where: {
        ...tenantWhere(ctx.session!),
        status: { in: ["NOT_ADVERTISING", "SEASONAL"] },
        deletedAt: null,
      },
      include: { _count: { select: { opportunities: true, aktivnosti: true } } },
      orderBy: { updatedAt: "desc" },
    });
  }),

  // KPI po prodavcu — PZ Faze 1: # sastanaka, # poziva, # ponuda, # won, ukupna vrednost, pipeline 90d
  individualKpis: withPermission("reports", "READ").input(
    z.object({ od: z.coerce.date().optional(), do: z.coerce.date().optional() }).optional(),
  ).query(async ({ ctx, input }) => {
    const od = input?.od ?? new Date(Date.now() - 90 * 86400000);
    const dod = input?.do ?? new Date();
    const next90 = new Date(Date.now() + 90 * 86400000);
    const tenant = ctx.session!.tenantId;

    const reps = await prisma.korisnik.findMany({
      where: {
        deletedAt: null,
        aktivan: true,
        roles: { some: { pravnoLiceId: tenant, rola: { kod: { in: ["SALES_REP", "SALES_MANAGER", "COUNTRY_MANAGER"] as any } } } },
      },
    });

    const rows = await Promise.all(reps.map(async (u) => {
      const [sastanci, pozivi, mailovi, followups, ponudePoslate, won, opps] = await Promise.all([
        prisma.aktivnost.count({ where: { autorId: u.id, tip: "SASTANAK", datum: { gte: od, lte: dod } } }),
        prisma.aktivnost.count({ where: { autorId: u.id, tip: "POZIV", datum: { gte: od, lte: dod } } }),
        prisma.aktivnost.count({ where: { autorId: u.id, tip: "MAIL", datum: { gte: od, lte: dod } } }),
        prisma.aktivnost.count({ where: { autorId: u.id, tip: "FOLLOW_UP", datum: { gte: od, lte: dod } } }),
        prisma.ponuda.count({ where: { vlasnikId: u.id, poslataAt: { gte: od, lte: dod } } }),
        prisma.opportunity.findMany({
          where: { vlasnikId: u.id, stage: { kod: "WON" }, closedAt: { gte: od, lte: dod } },
          select: { expValue: true },
        }),
        prisma.opportunity.findMany({
          where: { vlasnikId: u.id, deletedAt: null, expCloseDate: { gte: new Date(), lte: next90 }, stage: { kod: { notIn: ["WON", "LOST"] } } },
          select: { expValue: true, probability: true },
        }),
      ]);
      const wonValue = won.reduce((a, o) => a + Number(o.expValue), 0);
      const pipeline90 = opps.reduce((a, o) => a + Number(o.expValue), 0);
      const weighted90 = opps.reduce((a, o) => a + Number(o.expValue) * (o.probability / 100), 0);
      return {
        korisnikId: u.id,
        ime: `${u.ime} ${u.prezime}`,
        sastanci, pozivi, mailovi, followups,
        ponudePoslate,
        wonBroj: won.length,
        wonValue,
        pipeline90,
        weighted90,
      };
    }));
    return rows.sort((a, b) => b.wonValue - a.wonValue);
  }),

  // Team KPI: ukupna realizacija + weighted forecast + coverage + broj novih klijenata
  teamKpis: withPermission("reports", "READ").input(
    z.object({ od: z.coerce.date().optional(), do: z.coerce.date().optional() }).optional(),
  ).query(async ({ ctx, input }) => {
    const od = input?.od ?? new Date(Date.now() - 90 * 86400000);
    const dod = input?.do ?? new Date();
    const next90 = new Date(Date.now() + 90 * 86400000);
    const tenantId = ctx.session!.tenantId;

    const [won, openOpps, noviPartneri, planoviGodisnji] = await Promise.all([
      prisma.opportunity.findMany({
        where: { pravnoLiceId: tenantId, stage: { kod: "WON" }, closedAt: { gte: od, lte: dod } },
        select: { expValue: true, vlasnikId: true },
      }),
      prisma.opportunity.findMany({
        where: { pravnoLiceId: tenantId, deletedAt: null, expCloseDate: { lte: next90 }, stage: { kod: { notIn: ["WON", "LOST"] } } },
        select: { expValue: true, probability: true },
      }),
      prisma.partner.count({ where: { pravnoLiceId: tenantId, createdAt: { gte: od, lte: dod }, deletedAt: null } }),
      prisma.planRadaGodisnji.findMany({
        where: { pravnoLiceId: tenantId, godina: new Date().getFullYear() },
        include: { stavke: { where: { mesec: new Date().getMonth() + 1 } } },
      }),
    ]);

    const realized = won.reduce((a, o) => a + Number(o.expValue), 0);
    const weightedForecast = openOpps.reduce((a, o) => a + Number(o.expValue) * (o.probability / 100), 0);
    const monthlyTarget = planoviGodisnji.reduce((a, p) => a + p.stavke.reduce((b, s) => b + Number(s.target), 0), 0);
    const coverageRatio = monthlyTarget > 0 ? Math.round((weightedForecast / monthlyTarget) * 100) : 0;

    return {
      realized,
      weightedForecast,
      coverageRatio,
      monthlyTarget,
      noviKlijenti: noviPartneri,
      brojWonDeals: won.length,
      brojOpenOpps: openOpps.length,
    };
  }),

  // Sixmonth triger — kampanje koje su završene pre 6 meseci a partner nema novu
  sixMonthsSinceCampaign: withPermission("partners", "READ").query(async ({ ctx }) => {
    const cutoff = new Date(Date.now() - 180 * 86400000);
    const kampanje = await prisma.kampanja.findMany({
      where: { ...tenantWhere(ctx.session!), status: "ZAVRSENA", doDatum: { lte: cutoff } },
      include: { partner: true },
      orderBy: { doDatum: "desc" },
    });
    // Izbaci duplikate po partner-u (zadrži najnoviju)
    const seen = new Set<string>();
    const rows: Array<{ partner: string; partnerId: string; kampanjaNaziv: string; zavrsenaData: Date; daniOd: number }> = [];
    for (const k of kampanje) {
      if (seen.has(k.partnerId)) continue;
      seen.add(k.partnerId);
      // Skip ako partner ima noviji opportunity
      const noviji = await prisma.opportunity.findFirst({
        where: { partnerId: k.partnerId, createdAt: { gt: k.doDatum }, deletedAt: null },
      });
      if (noviji) continue;
      rows.push({
        partner: k.partner.naziv,
        partnerId: k.partnerId,
        kampanjaNaziv: k.naziv,
        zavrsenaData: k.doDatum,
        daniOd: Math.round((Date.now() - k.doDatum.getTime()) / 86400000),
      });
    }
    return rows.slice(0, 100);
  }),
});

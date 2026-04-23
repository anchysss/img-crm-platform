import { router, withPermission } from "../trpc";
import { prisma } from "@/lib/prisma";
import { tenantWhere } from "../tenant";
import { hasRole } from "../rbac";

export const dashboardRouter = router({
  today: withPermission("dashboard", "READ").query(async ({ ctx }) => {
    const session = ctx.session!;
    const tenant = tenantWhere(session);
    const isRep = hasRole(session, "SALES_REP");
    const filter = isRep
      ? { ...tenant, vlasnikId: session.korisnikId, deletedAt: null }
      : { ...tenant, deletedAt: null };

    const opportunities = await prisma.opportunity.findMany({
      where: filter,
      include: { stage: true, vlasnik: true },
    });

    const now = new Date();
    const in90 = new Date(now.getTime() + 90 * 86400000);
    const openOpps = opportunities.filter((o) => !["WON", "LOST"].includes(o.stage.kod));
    const weighted = openOpps.reduce((a, o) => a + Number(o.expValue) * (o.probability / 100), 0);

    const inNext90 = openOpps.filter((o) => o.expCloseDate >= now && o.expCloseDate <= in90);
    const weighted90 = inNext90.reduce((a, o) => a + Number(o.expValue) * (o.probability / 100), 0);
    const confirmed90 = inNext90
      .filter((o) => ["VERBALLY_CONFIRMED", "WON"].includes(o.stage.kod))
      .reduce((a, o) => a + Number(o.expValue), 0);

    const thisMonth = now.getMonth() + 1;
    const thisYear = now.getFullYear();
    const myPlan = await prisma.planRadaGodisnji.findFirst({
      where: { pravnoLiceId: session.tenantId, korisnikId: session.korisnikId, godina: thisYear },
      include: { stavke: { where: { mesec: thisMonth } } },
    });
    const monthlyTarget = myPlan?.stavke.reduce((a, s) => a + Number(s.target), 0) ?? 0;
    const coverageRatio = monthlyTarget > 0 ? Math.round((weighted / monthlyTarget) * 100) : 0;

    const last90 = new Date(now.getTime() - 90 * 86400000);
    const closed90 = opportunities.filter((o) => o.closedAt && o.closedAt >= last90);
    const won90 = closed90.filter((o) => o.stage.kod === "WON").length;
    const winRate90 = closed90.length ? Math.round((won90 / closed90.length) * 100) : 0;

    const startOfMonth = new Date(thisYear, thisMonth - 1, 1);
    const wonThisMonth = opportunities.filter((o) => o.stage.kod === "WON" && o.closedAt && o.closedAt >= startOfMonth);
    const closedWonValue = wonThisMonth.reduce((a, o) => a + Number(o.expValue), 0);

    // Time-in-stage alarm: > 60 dana u trenutnoj fazi
    const stale60 = openOpps
      .filter((o) => (Date.now() - o.stageUpdatedAt.getTime()) / 86400000 > 60)
      .map((o) => ({
        id: o.id,
        naziv: o.naziv,
        stage: o.stage.kod,
        daniUFazi: Math.round((Date.now() - o.stageUpdatedAt.getTime()) / 86400000),
      }))
      .slice(0, 10);

    // Today next-actions
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endToday = new Date(startToday.getTime() + 86400000);
    const todayActivities = await prisma.aktivnost.findMany({
      where: { autorId: session.korisnikId, nextActionDatum: { gte: startToday, lt: endToday } },
      orderBy: { nextActionDatum: "asc" },
      take: 20,
    });

    // Po prodavcu (za manager+)
    let perRep: Array<{ korisnikId: string; ime: string; pipeline: number; weighted: number; count: number }> = [];
    if (!isRep) {
      const grouped: Record<string, { ime: string; pipeline: number; weighted: number; count: number }> = {};
      for (const o of openOpps) {
        grouped[o.vlasnikId] ??= { ime: `${o.vlasnik.ime} ${o.vlasnik.prezime}`, pipeline: 0, weighted: 0, count: 0 };
        grouped[o.vlasnikId].pipeline += Number(o.expValue);
        grouped[o.vlasnikId].weighted += Number(o.expValue) * (o.probability / 100);
        grouped[o.vlasnikId].count += 1;
      }
      perRep = Object.entries(grouped).map(([id, v]) => ({ korisnikId: id, ...v }));
    }

    return {
      kpi: {
        openCount: openOpps.length,
        weightedPipeline: weighted,
        confirmed90,
        weighted90,
        coverageRatio,
        monthlyTarget,
        winRate90,
        closedWonMonth: closedWonValue,
      },
      stale60,
      todayActivities,
      perRep,
    };
  }),

  forecastAccuracy: withPermission("dashboard", "READ").query(async ({ ctx }) => {
    const now = new Date();
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const opps = await prisma.opportunity.findMany({
      where: { ...tenantWhere(ctx.session!), expCloseDate: { gte: prevStart, lte: prevEnd } },
      include: { stage: true, vlasnik: true },
    });
    const grouped: Record<string, { ime: string; forecasted: number; realized: number }> = {};
    for (const o of opps) {
      grouped[o.vlasnikId] ??= { ime: `${o.vlasnik.ime} ${o.vlasnik.prezime}`, forecasted: 0, realized: 0 };
      grouped[o.vlasnikId].forecasted += Number(o.expValue) * (o.probability / 100);
      if (o.stage.kod === "WON") grouped[o.vlasnikId].realized += Number(o.expValue);
    }
    return Object.entries(grouped).map(([id, v]) => ({
      korisnikId: id,
      ...v,
      accuracy: v.forecasted > 0 ? Math.round((v.realized / v.forecasted) * 100) : 0,
    }));
  }),
});

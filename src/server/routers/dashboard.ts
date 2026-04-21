import { z } from "zod";
import { router, withPermission } from "../trpc";
import { prisma } from "@/lib/prisma";
import { tenantWhere } from "../tenant";
import { hasRole } from "../rbac";

export const dashboardRouter = router({
  today: withPermission("dashboard", "READ").query(async ({ ctx }) => {
    const session = ctx.session!;
    const tenant = tenantWhere(session);

    const filter = hasRole(session, "SALES_REP")
      ? { ...tenant, vlasnikId: session.korisnikId, deletedAt: null }
      : { ...tenant, deletedAt: null };

    const opportunities = await prisma.opportunity.findMany({
      where: filter,
      include: { stage: true },
    });

    const openOpps = opportunities.filter((o) => !["WON", "LOST"].includes(o.stage.kod));
    const weighted = openOpps.reduce((acc, o) => acc + Number(o.expValue) * (o.probability / 100), 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const forecast = openOpps
      .filter((o) => o.expCloseDate >= startOfMonth && o.expCloseDate <= new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0))
      .reduce((acc, o) => acc + Number(o.expValue) * (o.probability / 100), 0);

    const last90 = new Date();
    last90.setDate(last90.getDate() - 90);
    const closed90 = opportunities.filter((o) => o.closedAt && o.closedAt >= last90);
    const won90 = closed90.filter((o) => o.stage.kod === "WON").length;
    const winRate90 = closed90.length ? Math.round((won90 / closed90.length) * 100) : 0;

    const wonThisMonth = opportunities.filter(
      (o) => o.stage.kod === "WON" && o.closedAt && o.closedAt >= startOfMonth,
    );
    const closedWonValue = wonThisMonth.reduce((acc, o) => acc + Number(o.expValue), 0);

    // Hot items (PZ 4.6)
    const stale = opportunities.filter((o) => {
      const days = (Date.now() - o.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
      return days > 14 && !["WON", "LOST"].includes(o.stage.kod);
    }).slice(0, 10);

    return {
      kpi: {
        openCount: openOpps.length,
        weightedPipeline: weighted,
        forecastMonth: forecast,
        winRate90: winRate90,
        closedWonMonth: closedWonValue,
      },
      stale,
    };
  }),
});

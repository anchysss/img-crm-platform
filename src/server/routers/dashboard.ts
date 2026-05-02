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

  // Aktivne + upcoming kampanje za Danas widget
  campaignsOverview: withPermission("dashboard", "READ").query(async ({ ctx }) => {
    const now = new Date();
    const past30 = new Date(now.getTime() - 30 * 86400000);
    const next90 = new Date(now.getTime() + 90 * 86400000);
    const kampanje = await prisma.kampanja.findMany({
      where: {
        ...tenantWhere(ctx.session!),
        deletedAt: null,
        odDatum: { lte: next90 },
        doDatum: { gte: past30 },
      },
      include: {
        partner: true,
        stavke: { include: { pozicija: { select: { tip: true } } } },
      },
      orderBy: { odDatum: "asc" },
      take: 50,
    });
    return kampanje.map((k) => {
      // Outdoor = bilo koja pozicija != UNUTRA; Indoor = bilo koja pozicija == UNUTRA
      const tipovi = new Set(k.stavke.map((s) => s.pozicija.tip));
      const hasIndoor = tipovi.has("UNUTRA");
      const hasOutdoor = Array.from(tipovi).some((t) => t !== "UNUTRA");
      return {
        id: k.id,
        naziv: k.naziv,
        status: k.status,
        partner: k.partner.naziv,
        odDatum: k.odDatum,
        doDatum: k.doDatum,
        valuta: k.valuta,
        hasOutdoor: hasOutdoor || (!hasIndoor && !hasOutdoor), // ako nema stavki, default outdoor
        hasIndoor,
      };
    });
  }),

  // Chart po vozilu — svako vozilo ima 2 reda (outdoor + indoor) za naredni period
  voziloKampanjeChart: withPermission("dashboard", "READ").query(async ({ ctx }) => {
    const now = new Date();
    const past30 = new Date(now.getTime() - 30 * 86400000);
    const next90 = new Date(now.getTime() + 90 * 86400000);

    const vozila = await prisma.vozilo.findMany({
      where: { ...tenantWhere(ctx.session!), aktivan: true },
      select: {
        id: true,
        sifra: true,
        registracija: true,
        model: true,
        garaza: true,
        tipVozilaTxt: true,
        pozicije: {
          select: {
            id: true,
            tip: true,
            kampanjaStavke: {
              where: {
                kampanja: {
                  deletedAt: null,
                  odDatum: { lte: next90 },
                  doDatum: { gte: past30 },
                },
              },
              select: {
                kampanjaId: true,
                odDatum: true,
                doDatum: true,
                kampanja: {
                  select: { id: true, naziv: true, status: true, partner: { select: { naziv: true } } },
                },
              },
            },
          },
        },
      },
      orderBy: [{ garaza: "asc" }, { sifra: "asc" }],
      take: 100,
    });

    return vozila.map((v) => {
      const outdoorKampanje: any[] = [];
      const indoorKampanje: any[] = [];
      for (const p of v.pozicije) {
        for (const ks of p.kampanjaStavke) {
          const target = p.tip === "UNUTRA" ? indoorKampanje : outdoorKampanje;
          // Dedup po kampanjaId
          if (!target.some((x) => x.id === ks.kampanjaId)) {
            target.push({
              id: ks.kampanjaId,
              naziv: ks.kampanja.naziv,
              status: ks.kampanja.status,
              partner: ks.kampanja.partner.naziv,
              odDatum: ks.odDatum,
              doDatum: ks.doDatum,
            });
          }
        }
      }
      return {
        id: v.id,
        sifra: v.sifra,
        registracija: v.registracija,
        model: v.model,
        garaza: v.garaza,
        tipVozila: v.tipVozilaTxt,
        outdoor: outdoorKampanje,
        indoor: indoorKampanje,
      };
    }).filter((v) => v.outdoor.length > 0 || v.indoor.length > 0);
  }),

  // Aktivne + poslate ponude (DRAFT, POSLATA, PRIHVACENA)
  ponudeOverview: withPermission("dashboard", "READ").query(async ({ ctx }) => {
    const session = ctx.session!;
    const isRep = hasRole(session, "SALES_REP");
    const ponude = await prisma.ponuda.findMany({
      where: {
        ...tenantWhere(session),
        ...(isRep ? { vlasnikId: session.korisnikId } : {}),
        status: { in: ["DRAFT", "POSLATA", "PRIHVACENA"] },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    const partnerIds = Array.from(new Set(ponude.map((p) => p.partnerId)));
    const partners = await prisma.partner.findMany({ where: { id: { in: partnerIds } }, select: { id: true, naziv: true } });
    const partnerMap = new Map(partners.map((p) => [p.id, p.naziv]));
    return ponude.map((p) => ({
      id: p.id,
      broj: p.broj,
      status: p.status,
      datum: p.datum,
      vaziDo: p.vaziDo,
      poslataAt: p.poslataAt,
      ukupno: p.ukupno.toString(),
      valuta: p.valuta,
      partner: partnerMap.get(p.partnerId) ?? "—",
      danaPoslata: p.poslataAt ? Math.floor((Date.now() - p.poslataAt.getTime()) / 86400000) : null,
    }));
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

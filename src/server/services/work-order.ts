/**
 * Automation kad Opportunity pređe u WON (ili iz convertToCampaign):
 *   1. Kreira se RadniNalog (logistika)
 *   2. Kreira se PlanFakturisanja sa auto-split po mesecima ako kampanja prelazi meseci
 *   3. Notifikuju se svi korisnici sa Finance / logističkim ulogama u datom tenant-u
 */
import { prisma } from "@/lib/prisma";
import { notifyRoles } from "./notify";
import { generateInvoiceNumber } from "./numeration";
import type { Opportunity, Kampanja } from "@prisma/client";

function rndBroj(prefix: string) {
  return `${prefix}-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
}

export async function createRadniNalogForOpportunity(opp: Opportunity & { partnerId: string; vlasnikId: string; pravnoLiceId: string; naziv: string }) {
  const existing = await prisma.radniNalog.findFirst({ where: { opportunityId: opp.id } });
  if (existing) return existing;

  const broj = rndBroj("RN");
  const rn = await prisma.radniNalog.create({
    data: {
      pravnoLiceId: opp.pravnoLiceId,
      broj,
      opportunityId: opp.id,
      partnerId: opp.partnerId,
      vlasnikProdajaId: opp.vlasnikId,
      status: "NOVO",
      odDatum: opp.expCloseDate,
      doDatum: new Date(opp.expCloseDate.getTime() + 30 * 86400000),
      napomena: `Auto-kreiran iz prihvaćene prilike: ${opp.naziv}`,
    },
  });

  await notifyRoles({
    pravnoLiceId: opp.pravnoLiceId,
    rolaKodovi: ["SALES_MANAGER", "COUNTRY_MANAGER", "ADMIN"],
    tip: "RADNI_NALOG_NOVI",
    poruka: `Novi radni nalog ${broj} — ${opp.naziv}. Prosleđen logistici.`,
    linkUrl: `/logistika/radni-nalozi/${rn.id}`,
  });

  return rn;
}

export async function createPlanFakturisanjaForWon(params: {
  opp: Opportunity & { pravnoLiceId: string; naziv: string; partnerId: string; vlasnikId: string; valuta: string; expValue: any };
  kampanjaOd: Date;
  kampanjaDo: Date;
}) {
  const { opp, kampanjaOd, kampanjaDo } = params;
  const existing = await prisma.planFakturisanja.findFirst({ where: { opportunityId: opp.id } });
  if (existing) return existing;

  // Split iznosa po mesecima srazmerno broju dana
  const totalDays = Math.max(1, Math.ceil((kampanjaDo.getTime() - kampanjaOd.getTime()) / 86400000) + 1);
  const ukupno = Number(opp.expValue);
  const splits: Array<{ godina: number; mesec: number; iznos: number }> = [];

  let cursor = new Date(kampanjaOd);
  cursor.setHours(0, 0, 0, 0);
  while (cursor <= kampanjaDo) {
    const mesecEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const end = mesecEnd < kampanjaDo ? mesecEnd : kampanjaDo;
    const daysInMonth = Math.ceil((end.getTime() - cursor.getTime()) / 86400000) + 1;
    const iznos = Math.round((ukupno * daysInMonth / totalDays) * 100) / 100;
    splits.push({ godina: cursor.getFullYear(), mesec: cursor.getMonth() + 1, iznos });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  // Ispravi razliku zbog zaokruženja
  const sum = splits.reduce((a, s) => a + s.iznos, 0);
  const diff = Math.round((ukupno - sum) * 100) / 100;
  if (diff !== 0 && splits.length > 0) {
    splits[splits.length - 1].iznos = Math.round((splits[splits.length - 1].iznos + diff) * 100) / 100;
  }

  const broj = rndBroj("PF");
  const plan = await prisma.planFakturisanja.create({
    data: {
      pravnoLiceId: opp.pravnoLiceId,
      broj,
      opportunityId: opp.id,
      partnerId: opp.partnerId,
      vlasnikProdajaId: opp.vlasnikId,
      valuta: opp.valuta,
      status: "NACRT",
      ukupno: String(ukupno),
      kampanjaOd,
      kampanjaDo,
      napomena: `Auto-kreiran iz prihvaćene prilike: ${opp.naziv}`,
      stavke: {
        create: splits.map((s) => ({
          mesec: s.mesec,
          godina: s.godina,
          iznos: String(s.iznos),
          valuta: opp.valuta,
        })),
      },
    },
    include: { stavke: true },
  });

  await notifyRoles({
    pravnoLiceId: opp.pravnoLiceId,
    rolaKodovi: ["FINANCE", "COUNTRY_MANAGER", "ADMIN"],
    tip: "PLAN_FAKTURISANJA_NOVI",
    poruka: `Novi plan fakturisanja ${broj} — ${opp.naziv}. Ukupno ${ukupno} ${opp.valuta}, ${splits.length} mesec${splits.length === 1 ? "" : "i"}.`,
    linkUrl: `/finansije/plan-fakturisanja/${plan.id}`,
  });

  return plan;
}

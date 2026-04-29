/**
 * Cron job — PZ 1. Faze trigger: "istekao ugovor" (mapirano na Ponuda.vaziDo).
 * Notifikuje vlasnika ako ponuda ističe za ≤ 3 dana ili je već istekla.
 */
/* eslint-disable no-console */
import { prisma } from "../../src/lib/prisma";
import { notify } from "../../src/server/services/notify";

const WARN_DAYS = Number(process.env.PONUDA_EXPIRING_DAYS ?? 3);

async function run() {
  const now = new Date();
  const inN = new Date(now.getTime() + WARN_DAYS * 86400000);
  const ponude = await prisma.ponuda.findMany({
    where: {
      status: { in: ["POSLATA", "DRAFT"] },
      vaziDo: { lte: inN },
    },
  });

  let notified = 0;
  for (const p of ponude) {
    const isExpired = p.vaziDo < now;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const exists = await prisma.notifikacija.findFirst({
      where: {
        korisnikId: p.vlasnikId,
        tip: "STARA_INTERAKCIJA",
        linkUrl: `/prodaja/ponude/${p.id}`,
        createdAt: { gte: startOfDay },
      },
    });
    if (exists) continue;

    const dani = Math.ceil((p.vaziDo.getTime() - now.getTime()) / 86400000);
    await notify({
      pravnoLiceId: p.pravnoLiceId,
      korisnikId: p.vlasnikId,
      tip: "STARA_INTERAKCIJA",
      poruka: isExpired
        ? `⚠️ Ponuda ${p.broj} je istekla ${Math.abs(dani)} dana ranije — automatski označi kao ISTEKLA ili pošalji nove uslove.`
        : `📅 Ponuda ${p.broj} ističe za ${dani} dan${dani === 1 ? "" : "a"} — proveri sa klijentom.`,
      linkUrl: `/prodaja/ponude/${p.id}`,
    });

    // Auto-mark expired ponude
    if (isExpired) {
      await prisma.ponuda.update({ where: { id: p.id }, data: { status: "ISTEKLA" } });
    }
    notified++;
  }
  console.log(`Expiring ponude: ${ponude.length} kandidata, ${notified} novih notifikacija`);
}

run().finally(() => prisma.$disconnect());

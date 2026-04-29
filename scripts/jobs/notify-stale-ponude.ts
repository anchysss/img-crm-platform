/**
 * Cron job — PZ 1. Faze: "ponuda poslata + nema odgovora 5 dana".
 * Šalje notifikaciju vlasniku ponude i kreira FOLLOW_UP aktivnost ako još ne postoji.
 */
/* eslint-disable no-console */
import { prisma } from "../../src/lib/prisma";
import { notify } from "../../src/server/services/notify";

const STALE_DAYS = Number(process.env.PONUDA_STALE_DAYS ?? 5);

async function run() {
  const cutoff = new Date(Date.now() - STALE_DAYS * 86400000);
  const ponude = await prisma.ponuda.findMany({
    where: {
      status: "POSLATA",
      poslataAt: { lt: cutoff },
    },
    include: { stavke: false },
  });

  let notified = 0;
  for (const p of ponude) {
    // Ne dupliraj — proveri da li je već poslata notifikacija danas
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const exists = await prisma.notifikacija.findFirst({
      where: {
        korisnikId: p.vlasnikId,
        tip: "FOLLOWUP_DOSPEO",
        linkUrl: `/prodaja/ponude/${p.id}`,
        createdAt: { gte: startOfDay },
      },
    });
    if (exists) continue;

    const danaOd = Math.floor((Date.now() - (p.poslataAt?.getTime() ?? Date.now())) / 86400000);
    await notify({
      pravnoLiceId: p.pravnoLiceId,
      korisnikId: p.vlasnikId,
      tip: "FOLLOWUP_DOSPEO",
      poruka: `⏰ Ponuda ${p.broj} poslata pre ${danaOd} dana — pozovi klijenta za odgovor.`,
      linkUrl: `/prodaja/ponude/${p.id}`,
    });

    // Auto-create FOLLOW_UP activity (idempotent — only one per ponuda)
    const existingAkt = await prisma.aktivnost.findFirst({
      where: {
        partnerId: p.partnerId,
        tip: "FOLLOW_UP",
        opis: { contains: p.broj },
      },
    });
    if (!existingAkt) {
      await prisma.aktivnost.create({
        data: {
          partnerId: p.partnerId,
          autorId: p.vlasnikId,
          tip: "FOLLOW_UP",
          datum: new Date(),
          opis: `Auto follow-up: poslata ponuda ${p.broj} pre ${danaOd} dana, nema odgovora.`,
          nextActionDatum: new Date(),
          nextActionOpis: `Pozovi klijenta za odgovor na ponudu ${p.broj}`,
        },
      });
    }
    notified++;
  }
  console.log(`Stale ponude check: ${ponude.length} kandidata, ${notified} novih notifikacija`);
}

run().finally(() => prisma.$disconnect());

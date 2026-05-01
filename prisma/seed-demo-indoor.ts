/**
 * Seed demo kampanju sa INDOOR + OUTDOOR pozicijama da bipartite chart
 * pokaže obe trake (gornju outdoor + donju indoor) za makar jednu
 * kampanju u svakom tenant-u.
 *
 * Pokreni: DATABASE_URL=… npx tsx prisma/seed-demo-indoor.ts
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.pravnoLice.findMany({ select: { id: true, naziv: true, valuta: true } });
  for (const t of tenants) {
    // Naði bilo koje vozilo ovog tenanta
    const vozilo = await prisma.vozilo.findFirst({ where: { pravnoLiceId: t.id }, select: { id: true } });
    if (!vozilo) {
      console.log(`[${t.naziv}] nema vozila — preskačem`);
      continue;
    }

    // Naði ili kreiraj OUTDOOR poziciju (CELO_VOZILO) na vozilu
    let outPoz = await prisma.pozicija.findFirst({
      where: { voziloId: vozilo.id, tip: "CELO_VOZILO" },
    });
    if (!outPoz) {
      outPoz = await prisma.pozicija.create({
        data: {
          voziloId: vozilo.id,
          tip: "CELO_VOZILO",
          dimenzije: "celo vozilo",
          minPeriodDana: 7,
          cenaPoPeriodu: 1000,
          valuta: t.valuta,
        },
      });
      console.log(`[${t.naziv}] kreirana OUTDOOR pozicija ${outPoz.id}`);
    }

    // Naði ili kreiraj INDOOR poziciju (UNUTRA) na vozilu
    let inPoz = await prisma.pozicija.findFirst({
      where: { voziloId: vozilo.id, tip: "UNUTRA" },
    });
    if (!inPoz) {
      inPoz = await prisma.pozicija.create({
        data: {
          voziloId: vozilo.id,
          tip: "UNUTRA",
          dimenzije: "unutrašnji branding",
          minPeriodDana: 7,
          cenaPoPeriodu: 500,
          valuta: t.valuta,
        },
      });
      console.log(`[${t.naziv}] kreirana INDOOR pozicija ${inPoz.id}`);
    }

    // Naði partner-a tenant-a
    const partner = await prisma.partner.findFirst({ where: { pravnoLiceId: t.id } });
    if (!partner) { console.log(`[${t.naziv}] nema partnera`); continue; }

    // Kreiraj demo kampanju "DEMO Outdoor + Indoor" za narednih 30d
    const naziv = "DEMO Outdoor + Indoor";
    const existing = await prisma.kampanja.findFirst({ where: { pravnoLiceId: t.id, naziv } });
    if (existing) {
      console.log(`[${t.naziv}] demo kampanja već postoji`);
      continue;
    }

    const od = new Date();
    const doD = new Date(); doD.setDate(doD.getDate() + 30);

    const kamp = await prisma.kampanja.create({
      data: {
        pravnoLiceId: t.id,
        partnerId: partner.id,
        naziv,
        odDatum: od,
        doDatum: doD,
        valuta: t.valuta,
        status: "POTVRDENA",
        stavke: {
          create: [
            { pozicijaId: outPoz.id, odDatum: od, doDatum: doD, cena: 1000, valuta: t.valuta },
            { pozicijaId: inPoz.id, odDatum: od, doDatum: doD, cena: 500, valuta: t.valuta },
          ],
        },
      },
    });
    console.log(`[${t.naziv}] kreirana demo kampanja ${kamp.id} (outdoor + indoor stavke)`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

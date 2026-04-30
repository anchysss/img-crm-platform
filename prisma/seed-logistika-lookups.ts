/**
 * Seed lookup tabela za outdoor logistiku iz primer fajlova:
 * - 30 paketa za Beograd parcial (5/10/20 vozila × 10)
 * - Folije (AVERY 3001 HOP …)
 * - Dorada (print & cut, cut + transfer, laminacija …)
 * - Mašine (LATEX, HP, XEIKON …)
 * - Montažeri (BUS BRANDING)
 * - Putni troškovi BG ↔ grad
 *
 * Pokreni: DATABASE_URL=… npx tsx prisma/seed-logistika-lookups.ts
 */

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// === PAKETI (30 ukupno: 5/10/20 vozila × 10 paketa) ===
const PAKETI_5 = [
  { paket: 1, sastav: "1 x KT4, 2 x Solo bus (2A, 82), 2 x zglobni bus (15, 16)" },
  { paket: 2, sastav: "1 x KT4, 2 x solo bus (38L, 78), 2 x zglobni bus (23, 27)" },
  { paket: 3, sastav: "1 x KT4, 2 x solo bus (75, 87), 2 x zglobni bus (31, 35)" },
  { paket: 4, sastav: "1 x KT4, 2 x solo bus (38, 76), 2 x zglobni bus (37, 43)" },
  { paket: 5, sastav: "1 x KT4, 2 x solo bus (68, 84), 2 x zglobni bus (58, 65)" },
  { paket: 6, sastav: "1 x KT4, 2 x solo bus (29, 67), 2 x zglobni bus (77, 83)" },
  { paket: 7, sastav: "1 x KT4, 2 x solo bus (27E, 44), 2 x zglobni bus (85, 95)" },
  { paket: 8, sastav: "1 x KT4, 2 x solo bus (3A, 9A), 2 x zglobni bus (15, 16)" },
  { paket: 9, sastav: "1 x KT4, 2 x solo bus (19, 21A), 2 x zglobni bus (23, 27)" },
  { paket: 10, sastav: "1 x KT4, 2 x solo bus (22, 74), 2 x zglobni bus (31, 35)" },
];
const PAKETI_10 = [
  { paket: 1, sastav: "2 x KT4, 4 x solo bus (2A, 76, 78, 82), 4 x zglobni bus (15, 16, 23, 27)" },
  { paket: 2, sastav: "2 x KT4, 4 x solo bus (38L, 71, 74, 75), 4 x zglobni bus (31, 35, 37, 43)" },
  { paket: 3, sastav: "2 x KT4, 4 x solo bus (44, 67, 68, 87), 4 x zglobni bus (58, 65, 77, 83)" },
  { paket: 4, sastav: "2 x KT4, 4 x solo bus (36, 38, 40, 41), 4 x zglobni bus (15, 16, 85, 95)" },
  { paket: 5, sastav: "2 x KT4, 4 x solo bus (3A, 9A, 19, 84), 4 x zglobni bus (23, 27, 31, 35)" },
  { paket: 6, sastav: "2 x KT4, 4 x solo bus (21A, 22, 25, 26), 4 x zglobni bus (37, 43, 58, 65)" },
  { paket: 7, sastav: "2 x KT4, 4 x solo bus (2A, 27E, 29, 78), 4 x zglobni bus (15, 23, 77, 83)" },
  { paket: 8, sastav: "2 x KT4, 4 x solo bus (38L, 74, 75, 76), 4 x zglobni bus (16, 27, 31, 35)" },
  { paket: 9, sastav: "2 x KT4, 4 x solo bus (44, 67, 68, 84), 4 x zglobni bus (35, 37, 43, 58)" },
  { paket: 10, sastav: "2 x KT4, 4 x solo bus (37E, 40, 41, 82), 4 x zglobni bus (65, 77, 83, 85)" },
];
const PAKETI_20 = [
  { paket: 1, sastav: "1 x CAF, 2 x KT4, 9 x solo bus, 8 x zglobni bus (varijanta 1)" },
  { paket: 2, sastav: "1 x CAF, 2 x KT4, 9 x solo bus (29, 36, 38, 38L, 40, 41, 44, …), 8 x zglobni bus (varijanta 2)" },
  { paket: 3, sastav: "1 x CAF, 2 x KT4, 9 x solo bus (2A, 3A, 9A, 19, 21A, 22, 25, …), 8 x zglobni bus (varijanta 3)" },
  { paket: 4, sastav: "1 x CAF, 2 x KT4, 9 x solo bus (38L, 44, 67, 68, 71, 74, 75, …), 8 x zglobni bus (varijanta 4)" },
  { paket: 5, sastav: "1 x CAF, 2 x KT4, 9 x solo bus (3A, 9A, 19, 21A, 22, 25, 26, …), 8 x zglobni bus (varijanta 5)" },
  { paket: 6, sastav: "1 x CAF, 2 x KT4, 9 x solo bus (2A, 29, 40, 41, 71, 74, 75, …), 8 x zglobni bus (varijanta 6)" },
  { paket: 7, sastav: "1 x CAF, 2 x KT4, 9 x solo bus (3A, 26, 29, 40, 41, 44, 67, …), 8 x zglobni bus (varijanta 7)" },
  { paket: 8, sastav: "1 x CAF, 2 x KT4, 9 x solo bus (9A, 19, 21A, 22, 25, 27E, 75, …), 8 x zglobni bus (varijanta 8)" },
  { paket: 9, sastav: "1 x CAF, 2 x KT4, 9 x solo bus (3A, 25, 27E, 29, 40, 41, 71, …), 8 x zglobni bus (varijanta 9)" },
  { paket: 10, sastav: "1 x CAF, 2 x KT4, 9 x solo bus (9A, 19, 21A, 22, 26, 27, 74, …), 8 x zglobni bus (varijanta 10)" },
];

const PAKETI = [
  ...PAKETI_5.map((p) => ({ kod: `PAKET_5_VOZ_${p.paket}`, naziv: `5 Vozila - Paket ${p.paket}`, brojVozila: 5, sastav: p.sastav })),
  ...PAKETI_10.map((p) => ({ kod: `PAKET_10_VOZ_${p.paket}`, naziv: `10 Vozila - Paket ${p.paket}`, brojVozila: 10, sastav: p.sastav })),
  ...PAKETI_20.map((p) => ({ kod: `PAKET_20_VOZ_${p.paket}`, naziv: `20 Vozila - Paket ${p.paket}`, brojVozila: 20, sastav: p.sastav })),
];

// === FOLIJE ===
const FOLIJE = [
  { kod: "AVERY_3001_HOP", naziv: "AVERY 3001 HOP" },
  { kod: "AVERY_MPI_1004", naziv: "AVERY MPI 1004" },
  { kod: "MACTAC_8200", naziv: "MACtac IMAGin 8200 Pro" },
  { kod: "ORACAL_3651", naziv: "Oracal 3651 RA" },
  { kod: "FOLIJA_3M_IJ20", naziv: "3M IJ 20" },
  { kod: "PERFORATED_VINIL", naziv: "Perforated vinil (one-way vision)" },
];

// === DORADA ===
const DORADE = [
  { kod: "BEZ_LAMINACIJE", naziv: "BEZ LAMINACIJE" },
  { kod: "LAMINACIJA", naziv: "laminacija" },
  { kod: "PRINT_CUT", naziv: "print & cut" },
  { kod: "CUT_TRANSFER", naziv: "cut + transfer" },
  { kod: "PRINT_CUT_LAMINACIJA", naziv: "print & cut + laminacija" },
  { kod: "SECENJE_NA_FORMAT", naziv: "sečenje na format" },
];

// === MAŠINE ===
const MASINE = [
  { kod: "LATEX", naziv: "LATEX" },
  { kod: "HP", naziv: "HP" },
  { kod: "XEIKON", naziv: "XEIKON" },
  { kod: "ECO_SOLVENT", naziv: "Eco-solvent" },
  { kod: "UV", naziv: "UV štampa" },
];

// === MONTAŽERI ===
const MONTAZERI = [
  { naziv: "BUS BRANDING", napomena: "Glavna ekipa za sve gradove" },
  { naziv: "IMG INTERNAL", napomena: "Interna IMG ekipa" },
];

// === PUTNI TROŠKOVI (BG ↔ grad) ===
const PUTNI_TROSKOVI = [
  { gradOd: "BG", gradDo: "VA", km: 190, cena: 4500 }, // Valjevo
  { gradOd: "BG", gradDo: "SD", km: 108, cena: 2550 }, // Smederevo
  { gradOd: "BG", gradDo: "KŠ", km: 400, cena: 11200 }, // Kraljevo (?)
  { gradOd: "BG", gradDo: "NS", km: 220, cena: 7700 }, // Novi Sad
  { gradOd: "BG", gradDo: "SU", km: 400, cena: 9500 }, // Subotica
  { gradOd: "BG", gradDo: "ČA", km: 300, cena: 7200 }, // Čačak
  { gradOd: "BG", gradDo: "KG", km: 280, cena: 6600 }, // Kragujevac
  { gradOd: "BG", gradDo: "LE", km: 570, cena: 13200 }, // Leskovac
];

async function main() {
  const tenants = await prisma.pravnoLice.findMany({ select: { id: true, naziv: true } });
  if (tenants.length === 0) { console.log("Nema tenant-a"); return; }

  for (const t of tenants) {
    console.log(`\n=== ${t.naziv} ===`);

    // Paketi
    for (const p of PAKETI) {
      await prisma.paketVozila.upsert({
        where: { pravnoLiceId_kod: { pravnoLiceId: t.id, kod: p.kod } },
        update: { naziv: p.naziv, brojVozila: p.brojVozila, sastav: p.sastav },
        create: { pravnoLiceId: t.id, ...p },
      });
    }
    console.log(`  paketi: ${PAKETI.length}`);

    // Folije
    for (const f of FOLIJE) {
      await prisma.folija.upsert({
        where: { pravnoLiceId_kod: { pravnoLiceId: t.id, kod: f.kod } },
        update: { naziv: f.naziv },
        create: { pravnoLiceId: t.id, ...f },
      });
    }
    console.log(`  folije: ${FOLIJE.length}`);

    // Dorade
    for (const d of DORADE) {
      await prisma.dorada.upsert({
        where: { pravnoLiceId_kod: { pravnoLiceId: t.id, kod: d.kod } },
        update: { naziv: d.naziv },
        create: { pravnoLiceId: t.id, ...d },
      });
    }
    console.log(`  dorade: ${DORADE.length}`);

    // Mašine
    for (const m of MASINE) {
      await prisma.masina.upsert({
        where: { pravnoLiceId_kod: { pravnoLiceId: t.id, kod: m.kod } },
        update: { naziv: m.naziv },
        create: { pravnoLiceId: t.id, ...m },
      });
    }
    console.log(`  mašine: ${MASINE.length}`);

    // Montažeri
    for (const m of MONTAZERI) {
      const existing = await prisma.montazer.findFirst({ where: { pravnoLiceId: t.id, naziv: m.naziv } });
      if (!existing) await prisma.montazer.create({ data: { pravnoLiceId: t.id, ...m } });
    }
    console.log(`  montažeri: ${MONTAZERI.length}`);

    // Putni troškovi
    for (const p of PUTNI_TROSKOVI) {
      await prisma.putniTrosak.upsert({
        where: { pravnoLiceId_gradOd_gradDo: { pravnoLiceId: t.id, gradOd: p.gradOd, gradDo: p.gradDo } },
        update: { kmJedanSmer: p.km, cenaUkupno: p.cena, valuta: "RSD" },
        create: { pravnoLiceId: t.id, gradOd: p.gradOd, gradDo: p.gradDo, kmJedanSmer: p.km, cenaUkupno: p.cena, valuta: "RSD" },
      });
    }
    console.log(`  putni troškovi: ${PUTNI_TROSKOVI.length}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

/**
 * Seed default RasporedPlakata po tipu vozila prema LOGISTIKA.pdf
 * - Solaris zglobni: 1+8 (1× 46x80 folija + 8× 79x37 folija)
 * - Solo bus:        3 (3× 47x77 sv)
 * - KT4 tramvaj:     7 (7× 42x77 vertikala)
 * - CAF tramvaj:     1+10+8 (1× 70x46 ram + 10× 47x77 sv + 8× 79x37 folija)
 * - Trolejbus 321:   3+4 (3× 47x77 sv + 4× 79x37 folija)
 *
 * Pokreni: per tenant, npr.
 *   PRAVNO_LICE_ID=<id> npx tsx prisma/seed-rasporedi.ts
 */

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const RASPOREDI = [
  {
    voziloTipKod: "SOLARIS_ZGLOBNI",
    naziv: "Solaris zglobni autobus",
    sifraRasporeda: "1+8",
    panoi: [
      { format: "46x80", broj: 1, tip: "FOLIJA", pozicija: "iza vozača" },
      { format: "79x37", broj: 8, tip: "FOLIJA", pozicija: "kosine" },
    ],
    ukupnoPovrsina: 9,
  },
  {
    voziloTipKod: "AUTOBUS_SOLO",
    naziv: "Solo autobus",
    sifraRasporeda: "3",
    panoi: [{ format: "47x77", broj: 3, tip: "SV", pozicija: "vertikale" }],
    ukupnoPovrsina: 3,
  },
  {
    voziloTipKod: "KT4",
    naziv: "KT4 tramvaj",
    sifraRasporeda: "7",
    panoi: [{ format: "42x77", broj: 7, tip: "VERTIKALA", pozicija: "vertikale" }],
    ukupnoPovrsina: 7,
  },
  {
    voziloTipKod: "CAF",
    naziv: "CAF tramvaj",
    sifraRasporeda: "1+10+8",
    panoi: [
      { format: "70x46", broj: 1, tip: "RAM", pozicija: "iza vozača" },
      { format: "47x77", broj: 10, tip: "SV", pozicija: "vertikale" },
      { format: "79x37", broj: 8, tip: "FOLIJA", pozicija: "kosine" },
    ],
    ukupnoPovrsina: 19,
  },
  {
    voziloTipKod: "TROLEJBUS_321",
    naziv: "Trolejbus 321",
    sifraRasporeda: "3+4",
    panoi: [
      { format: "47x77", broj: 3, tip: "SV", pozicija: "vertikale" },
      { format: "79x37", broj: 4, tip: "FOLIJA", pozicija: "kosine" },
    ],
    ukupnoPovrsina: 7,
  },
];

async function main() {
  const tenants = await prisma.pravnoLice.findMany({ select: { id: true, naziv: true } });
  if (tenants.length === 0) {
    console.log("Nema tenant-a u bazi.");
    return;
  }
  for (const t of tenants) {
    for (const r of RASPOREDI) {
      const existing = await prisma.rasporedPlakata.findUnique({
        where: { pravnoLiceId_voziloTipKod: { pravnoLiceId: t.id, voziloTipKod: r.voziloTipKod } },
      });
      if (existing) {
        console.log(`[${t.naziv}] ${r.voziloTipKod} već postoji — preskačem`);
        continue;
      }
      await prisma.rasporedPlakata.create({
        data: { pravnoLiceId: t.id, ...r },
      });
      console.log(`[${t.naziv}] kreiran ${r.voziloTipKod} (${r.sifraRasporeda}, ${r.ukupnoPovrsina} površina)`);
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

/**
 * Seed ADD-ON za M12 dodatne module. Idempotentno (upsert po (pravnoLice, kod)).
 * Pokrenuti nakon glavnog seed-a: `npx tsx prisma/seed-addons.ts`
 */
/* eslint-disable no-console */
import { PrismaClient, TipOglasa, JedinicaMere } from "@prisma/client";

const prisma = new PrismaClient();

const KATEGORIJE = [
  { kod: "FMCG", naziv: "FMCG / Maloprodaja" },
  { kod: "FINANCE", naziv: "Bankarstvo i osiguranje" },
  { kod: "TELCO", naziv: "Telekomunikacije" },
  { kod: "PHARMA", naziv: "Farmacija" },
  { kod: "AUTO", naziv: "Automobilska industrija" },
  { kod: "RETAIL", naziv: "Maloprodaja" },
  { kod: "FOOD_BEV", naziv: "Hrana i piće" },
  { kod: "FASHION", naziv: "Moda i lifestyle" },
  { kod: "TECH", naziv: "Tehnologija" },
  { kod: "GOV", naziv: "Javni sektor" },
  { kod: "EDU", naziv: "Obrazovanje" },
  { kod: "ENTERTAINMENT", naziv: "Zabava i mediji" },
  { kod: "REAL_ESTATE", naziv: "Nekretnine" },
  { kod: "AGENCIES", naziv: "Agencije" },
];

// Cenovnik — tipične stavke IMG-a po tipu oglasa
const CENOVNIK = [
  { kod: "OUT_SOLO_TOTAL_WK", naziv: "Outdoor solo - Total branding (nedeljno)", tipOglasa: TipOglasa.OUTDOOR_TOTAL, jedinicaMere: JedinicaMere.PER_WEEK, cena: "650" },
  { kod: "OUT_SOLO_PARCIJAL_WK", naziv: "Outdoor solo - Parcijal (nedeljno)", tipOglasa: TipOglasa.OUTDOOR_PARCIJAL, jedinicaMere: JedinicaMere.PER_WEEK, cena: "350" },
  { kod: "OUT_OPEN_TOP_WK", naziv: "Outdoor open-top (nedeljno)", tipOglasa: TipOglasa.OUTDOOR_OPEN_TOP, jedinicaMere: JedinicaMere.PER_WEEK, cena: "900" },
  { kod: "IN_STANDARD_WK", naziv: "Indoor standard poster (nedeljno)", tipOglasa: TipOglasa.INDOOR_STANDARD, jedinicaMere: JedinicaMere.PER_WEEK, cena: "45" },
  { kod: "IN_DIGITAL_WK", naziv: "Indoor digital display (nedeljno)", tipOglasa: TipOglasa.INDOOR_DIGITAL, jedinicaMere: JedinicaMere.PER_WEEK, cena: "120" },
  { kod: "IN_BACKLIGHT_WK", naziv: "Indoor backlight (nedeljno)", tipOglasa: TipOglasa.INDOOR_BACKLIGHT, jedinicaMere: JedinicaMere.PER_WEEK, cena: "85" },
];

// Paketi — Beograd nova tri iz korisničkog zahteva + osnovni Total i Parcijal
const PAKETI = [
  // Novi Beograd paketi (OUTDOOR spoljašnjost)
  { kod: "BG_OUT_SOLO_5", naziv: "BG Outdoor SOLO — 5 vozila", grad: "Beograd", tipOglasa: TipOglasa.OUTDOOR_TOTAL, brojVozila: 5, minTrajanjeDana: 14, cena: "5800" },
  { kod: "BG_OUT_SOLO_10", naziv: "BG Outdoor SOLO — 10 vozila", grad: "Beograd", tipOglasa: TipOglasa.OUTDOOR_TOTAL, brojVozila: 10, minTrajanjeDana: 14, cena: "10500" },
  { kod: "BG_OUT_SOLO_20", naziv: "BG Outdoor SOLO — 20 vozila", grad: "Beograd", tipOglasa: TipOglasa.OUTDOOR_TOTAL, brojVozila: 20, minTrajanjeDana: 14, cena: "19000" },
  // Parcijal
  { kod: "BG_OUT_PARCIJAL_10", naziv: "BG Outdoor PARCIJAL — 10 vozila", grad: "Beograd", tipOglasa: TipOglasa.OUTDOOR_PARCIJAL, brojVozila: 10, minTrajanjeDana: 14, cena: "5900" },
  { kod: "BG_OUT_PARCIJAL_20", naziv: "BG Outdoor PARCIJAL — 20 vozila", grad: "Beograd", tipOglasa: TipOglasa.OUTDOOR_PARCIJAL, brojVozila: 20, minTrajanjeDana: 14, cena: "10800" },
  // Open top
  { kod: "BG_OUT_OPEN_TOP_4", naziv: "BG Outdoor OPEN TOP — 4 vozila", grad: "Beograd", tipOglasa: TipOglasa.OUTDOOR_OPEN_TOP, brojVozila: 4, minTrajanjeDana: 14, cena: "6400" },
  // Indoor
  { kod: "BG_IN_DIGITAL_MEDIUM", naziv: "BG Indoor DIGITAL — Medium paket (2 nedelje)", grad: "Beograd", tipOglasa: TipOglasa.INDOOR_DIGITAL, brojVozila: 10, minTrajanjeDana: 14, cena: "2800" },
];

async function main() {
  const pravnaLica = await prisma.pravnoLice.findMany();
  for (const pl of pravnaLica) {
    console.log(`\n▶ ${pl.kod} — kategorije delatnosti`);
    for (const k of KATEGORIJE) {
      await prisma.kategorijaDelatnosti.upsert({
        where: { pravnoLiceId_kod: { pravnoLiceId: pl.id, kod: k.kod } },
        update: { naziv: k.naziv },
        create: { pravnoLiceId: pl.id, kod: k.kod, naziv: k.naziv },
      });
    }

    console.log(`  cenovnik (${pl.valuta})`);
    for (const c of CENOVNIK) {
      await prisma.cenovnik.upsert({
        where: { pravnoLiceId_kod: { pravnoLiceId: pl.id, kod: c.kod } },
        update: { naziv: c.naziv, cena: c.cena, valuta: pl.valuta, tipOglasa: c.tipOglasa, jedinicaMere: c.jedinicaMere },
        create: { pravnoLiceId: pl.id, kod: c.kod, naziv: c.naziv, cena: c.cena, valuta: pl.valuta, tipOglasa: c.tipOglasa, jedinicaMere: c.jedinicaMere },
      });
    }

    // Paketi samo za SRB (nalog za spoljašnjost - Beograd)
    if (pl.kod === "SRB") {
      console.log(`  paketi Beograd`);
      for (const p of PAKETI) {
        await prisma.paket.upsert({
          where: { pravnoLiceId_kod: { pravnoLiceId: pl.id, kod: p.kod } },
          update: {
            naziv: p.naziv,
            grad: p.grad,
            tipOglasa: p.tipOglasa,
            brojVozila: p.brojVozila,
            minTrajanjeDana: p.minTrajanjeDana,
            cena: p.cena,
            valuta: pl.valuta,
          },
          create: {
            pravnoLiceId: pl.id,
            kod: p.kod,
            naziv: p.naziv,
            grad: p.grad,
            tipOglasa: p.tipOglasa,
            brojVozila: p.brojVozila,
            minTrajanjeDana: p.minTrajanjeDana,
            cena: p.cena,
            valuta: pl.valuta,
          },
        });
      }
    }
  }

  console.log("\n✓ Add-on seed gotov.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

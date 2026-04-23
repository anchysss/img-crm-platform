/**
 * Seed v2 — dodaje nove Stage-ove (LEAD, CONTACTED) i Lost reason-e (AGENCIJA, BUDZET_NIJE_ODOBREN)
 * i ažurira probability sa fiksnim vrednostima iz PZ Faze 1:
 *   Offer (PROPOSAL_SENT)     → 50%
 *   Negotiation               → 70%
 *   Verbal (VERBALLY_CONFIRMED)→ 90%
 */
/* eslint-disable no-console */
import { PrismaClient, StageKod, LostReasonKod } from "@prisma/client";
const prisma = new PrismaClient();

const STAGES: Array<{ kod: StageKod; naziv: string; defaultProbability: number; redosled: number }> = [
  { kod: "LEAD", naziv: "Lead", defaultProbability: 5, redosled: 0 },
  { kod: "CONTACTED", naziv: "Contacted", defaultProbability: 15, redosled: 1 },
  { kod: "NEW", naziv: "New / Kvalifikacija", defaultProbability: 20, redosled: 2 },
  { kod: "QUALIFIED", naziv: "Qualified", defaultProbability: 30, redosled: 3 },
  { kod: "PROPOSAL_SENT", naziv: "Offer sent", defaultProbability: 50, redosled: 4 },
  { kod: "NEGOTIATION", naziv: "Negotiation", defaultProbability: 70, redosled: 5 },
  { kod: "VERBALLY_CONFIRMED", naziv: "Verbal", defaultProbability: 90, redosled: 6 },
  { kod: "WON", naziv: "Won", defaultProbability: 100, redosled: 7 },
  { kod: "LOST", naziv: "Lost", defaultProbability: 0, redosled: 8 },
];

const LOSTS: Array<{ kod: LostReasonKod; naziv: string }> = [
  { kod: "CENA", naziv: "Cena" },
  { kod: "KONKURENCIJA", naziv: "Konkurencija" },
  { kod: "AGENCIJA", naziv: "Agencija preuzela klijenta" },
  { kod: "BUDZET_NIJE_ODOBREN", naziv: "Budžet nije odobren" },
  { kod: "TIMING", naziv: "Timing" },
  { kod: "BEZ_ODLUKE", naziv: "Bez odluke" },
  { kod: "DUPLIKAT", naziv: "Duplikat" },
  { kod: "OSTALO", naziv: "Ostalo (slobodan tekst)" },
];

async function main() {
  console.log("▶ Stage update (fixed probabilities per PZ)");
  for (const s of STAGES) {
    await prisma.stage.upsert({
      where: { kod: s.kod },
      update: { naziv: s.naziv, defaultProbability: s.defaultProbability, redosled: s.redosled, aktivan: true },
      create: s,
    });
  }

  console.log("▶ Lost reason update");
  for (const lr of LOSTS) {
    await prisma.lostReason.upsert({
      where: { kod: lr.kod },
      update: { naziv: lr.naziv, aktivan: true },
      create: lr,
    });
  }

  console.log("✓ v2 seed gotov.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

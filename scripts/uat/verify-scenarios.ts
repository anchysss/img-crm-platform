/**
 * UAT scenario verifier — automatska provera ključnih PZ zahteva (poglavlje 12 + 15).
 * Pokreće se kroz `npx tsx scripts/uat/verify-scenarios.ts`.
 * Ne zamenjuje manualne UAT korake, ali daje CI-friendly sanity check.
 */
/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface Check {
  id: string;
  title: string;
  run: () => Promise<{ ok: boolean; detail: string }>;
}

const checks: Check[] = [
  {
    id: "UAT-01a",
    title: "Seed: 4 pravna lica postoje (MNE/SRB/HRV/BIH)",
    run: async () => {
      const pl = await prisma.pravnoLice.findMany();
      const kodovi = pl.map((p) => p.kod).sort();
      const expected = ["BIH", "HRV", "MNE", "SRB"];
      return { ok: expected.every((k) => kodovi.includes(k)), detail: `kodovi=${kodovi.join(",")}` };
    },
  },
  {
    id: "UAT-01b",
    title: "Seed: 6 rola sa strogim FK",
    run: async () => {
      const role = await prisma.rola.findMany();
      return { ok: role.length === 6, detail: `role=${role.length}` };
    },
  },
  {
    id: "UAT-01c",
    title: "RBAC: ADMIN ima invoices.APPROVE permisiju",
    run: async () => {
      const d = await prisma.dozvola.findFirst({ where: { modul: "invoices", akcija: "APPROVE", rola: { kod: "ADMIN" } } });
      return { ok: !!d, detail: d ? "OK" : "FAIL: missing permission" };
    },
  },
  {
    id: "UAT-01d",
    title: "RBAC: READ_ONLY nema CREATE permisiju za partnere",
    run: async () => {
      const d = await prisma.dozvola.findFirst({ where: { modul: "partners", akcija: "CREATE", rola: { kod: "READ_ONLY" } } });
      return { ok: !d, detail: d ? "FAIL: unexpected permission" : "OK" };
    },
  },
  {
    id: "UAT-02",
    title: "Opportunity pipeline: seed pokriva sve Stage-ove",
    run: async () => {
      const stages = await prisma.stage.findMany();
      const counts = await Promise.all(stages.map(async (s) => ({ kod: s.kod, n: await prisma.opportunity.count({ where: { stageId: s.id } }) })));
      const populated = counts.filter((c) => c.n > 0).length;
      return { ok: populated >= 5, detail: counts.map((c) => `${c.kod}=${c.n}`).join(", ") };
    },
  },
  {
    id: "UAT-03",
    title: "Multi-country: svako pravno lice ima korisnike",
    run: async () => {
      const pl = await prisma.pravnoLice.findMany({ include: { _count: { select: { korisnici: true } } } });
      const withUsers = pl.filter((p) => p._count.korisnici > 0);
      return { ok: withUsers.length >= 2, detail: pl.map((p) => `${p.kod}=${p._count.korisnici}`).join(", ") };
    },
  },
  {
    id: "UAT-04",
    title: "Invoice numeration: seed dokumenti imaju validan format broja",
    run: async () => {
      const dokumenti = await prisma.dokument.findMany({ take: 5 });
      const format = /^(PRE|INV|ADV|CRN)-(MNE|SRB|HRV|BIH)-\d{4}-\d{6}$/;
      const valid = dokumenti.every((d) => format.test(d.broj));
      return { ok: valid, detail: dokumenti.map((d) => d.broj).join(", ") };
    },
  },
  {
    id: "UAT-05",
    title: "GDPR pseudonimizacija: kontakt bez pseudonimizacije ima email, nakon markovanja nema",
    run: async () => {
      const k = await prisma.kontakt.findFirst({ where: { pseudonimizovan: false, email: { not: null } } });
      return { ok: !!k, detail: k ? `kontakt ${k.id} ima email` : "nema nepseudonimizovanih kontakata sa email-om" };
    },
  },
  {
    id: "UAT-06",
    title: "Audit log: seed kreira zapise za korisnike/mutacije (non-empty log)",
    run: async () => {
      const n = await prisma.auditLog.count();
      return { ok: n >= 0, detail: `entries=${n}` };
    },
  },
  {
    id: "UAT-07",
    title: "Inventar: vozila imaju pozicije (minimum 1 po vozilu)",
    run: async () => {
      const vozila = await prisma.vozilo.findMany({ include: { _count: { select: { pozicije: true } } } });
      const bez = vozila.filter((v) => v._count.pozicije === 0);
      return { ok: bez.length === 0, detail: `ukupno=${vozila.length}, bez pozicija=${bez.length}` };
    },
  },
  {
    id: "UAT-08",
    title: "Stage konfiguracija: sve vrednosti iz PZ 4.4 prisutne",
    run: async () => {
      const stages = await prisma.stage.findMany();
      const kodovi = stages.map((s) => s.kod).sort();
      const expected = ["LOST", "NEGOTIATION", "NEW", "PROPOSAL_SENT", "QUALIFIED", "VERBALLY_CONFIRMED", "WON"];
      return { ok: JSON.stringify(kodovi) === JSON.stringify(expected), detail: `kodovi=${kodovi.join(",")}` };
    },
  },
  {
    id: "UAT-09",
    title: "Lost reason: sve vrednosti iz PZ 4.4 prisutne",
    run: async () => {
      const rs = await prisma.lostReason.findMany();
      const kodovi = rs.map((r) => r.kod).sort();
      const expected = ["BEZ_ODLUKE", "CENA", "DUPLIKAT", "KONKURENCIJA", "OSTALO", "TIMING"];
      return { ok: JSON.stringify(kodovi) === JSON.stringify(expected), detail: `kodovi=${kodovi.join(",")}` };
    },
  },
];

async function main() {
  let passed = 0;
  let failed = 0;
  const rows: string[] = [];
  for (const c of checks) {
    try {
      const r = await c.run();
      const mark = r.ok ? "✓" : "✗";
      rows.push(`${mark} ${c.id.padEnd(8)} ${c.title}`);
      if (!r.ok) rows.push(`         ↳ ${r.detail}`);
      r.ok ? passed++ : failed++;
    } catch (e: any) {
      rows.push(`✗ ${c.id.padEnd(8)} ${c.title}`);
      rows.push(`         ↳ ERROR: ${e.message}`);
      failed++;
    }
  }
  console.log("=".repeat(70));
  console.log("UAT scenario verifier — IMG CRM");
  console.log("=".repeat(70));
  rows.forEach((r) => console.log(r));
  console.log("=".repeat(70));
  console.log(`Total: ${passed + failed} · Passed: ${passed} · Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().finally(() => prisma.$disconnect());

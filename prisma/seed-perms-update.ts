/**
 * Idempotentno dodavanje nedostajućih dozvola za SALES_MANAGER i SALES_REP
 * (campaigns CREATE/UPDATE/DELETE i sl.) na osnovu trenutne PERMISSION_MATRIX.
 * Pokreni: DATABASE_URL=… npx tsx prisma/seed-perms-update.ts
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const ADD: Array<{ rola: string; modul: string; akcije: string[] }> = [
  { rola: "SALES_MANAGER", modul: "campaigns", akcije: ["CREATE", "DELETE", "EXPORT"] },
  { rola: "SALES_REP", modul: "campaigns", akcije: ["CREATE", "UPDATE"] },
  { rola: "SALES_REP", modul: "vehicles", akcije: ["READ"] },
];

async function main() {
  for (const { rola, modul, akcije } of ADD) {
    const r = await prisma.rola.findFirst({ where: { kod: rola as any } });
    if (!r) {
      console.log(`Nema role ${rola} — preskačem`);
      continue;
    }
    for (const akcija of akcije) {
      const existing = await prisma.dozvola.findUnique({
        where: { rolaId_modul_akcija: { rolaId: r.id, modul, akcija: akcija as any } },
      });
      if (existing) {
        console.log(`  ${rola}/${modul}.${akcija}: već postoji`);
      } else {
        await prisma.dozvola.create({ data: { rolaId: r.id, modul, akcija: akcija as any } });
        console.log(`  ${rola}/${modul}.${akcija}: ✓ dodato`);
      }
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

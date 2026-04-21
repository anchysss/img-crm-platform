/**
 * Background job: oslobađa HOLD rezervacije kojima je istekao `holdIstice`.
 * Pokreće se kroz cron (vercel cron / GitHub Actions / systemd timer).
 */
import { prisma } from "../../src/lib/prisma";
import { RezervacijaStatus } from "@prisma/client";

async function run() {
  const expired = await prisma.rezervacija.findMany({
    where: { status: RezervacijaStatus.HOLD, holdIstice: { lt: new Date() } },
  });
  for (const r of expired) {
    await prisma.rezervacija.update({ where: { id: r.id }, data: { status: RezervacijaStatus.RELEASED } });
    await prisma.auditLog.create({
      data: {
        entitet: "Rezervacija",
        entitetId: r.id,
        akcija: "HOLD_RELEASE",
        diff: { reason: "expired" },
      },
    });
  }
  // eslint-disable-next-line no-console
  console.log(`Released ${expired.length} expired holds`);
}

run().finally(() => prisma.$disconnect());

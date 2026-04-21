/**
 * Background job: POTVRDENA → U_REALIZACIJI → ZAVRSENA po datumu.
 * PZ 4.7.
 */
import { prisma } from "../../src/lib/prisma";
import { KampanjaStatus, RezervacijaStatus } from "@prisma/client";

async function run() {
  const now = new Date();

  const toStart = await prisma.kampanja.findMany({
    where: { status: KampanjaStatus.POTVRDENA, odDatum: { lte: now } },
  });
  for (const k of toStart) {
    await prisma.kampanja.update({ where: { id: k.id }, data: { status: KampanjaStatus.U_REALIZACIJI } });
    await prisma.rezervacija.updateMany({
      where: { kampanjaId: k.id, status: RezervacijaStatus.CONFIRMED },
      data: { status: RezervacijaStatus.RUNNING },
    });
  }

  const toFinish = await prisma.kampanja.findMany({
    where: { status: KampanjaStatus.U_REALIZACIJI, doDatum: { lt: now } },
  });
  for (const k of toFinish) {
    await prisma.kampanja.update({ where: { id: k.id }, data: { status: KampanjaStatus.ZAVRSENA } });
    await prisma.rezervacija.updateMany({
      where: { kampanjaId: k.id, status: RezervacijaStatus.RUNNING },
      data: { status: RezervacijaStatus.RELEASED },
    });
  }

  // eslint-disable-next-line no-console
  console.log(`Started ${toStart.length}, finished ${toFinish.length} campaigns`);
}

run().finally(() => prisma.$disconnect());

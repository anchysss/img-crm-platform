/**
 * Cron job: detektuje Opportunity koji zapeo u fazi > X dana
 * i šalje OPP_ZAPEO notifikaciju vlasniku + menadžeru tima.
 * PZ 4.12.
 */
import { prisma } from "../../src/lib/prisma";
import { notify } from "../../src/server/services/notify";

const STALE_DAYS = Number(process.env.STALE_DAYS ?? 14);

async function run() {
  const threshold = new Date(Date.now() - STALE_DAYS * 86400000);
  const stale = await prisma.opportunity.findMany({
    where: {
      deletedAt: null,
      updatedAt: { lte: threshold },
      stage: { kod: { in: ["NEW", "QUALIFIED", "PROPOSAL_SENT", "NEGOTIATION", "VERBALLY_CONFIRMED"] } },
    },
    include: { vlasnik: true, stage: true },
  });

  for (const opp of stale) {
    await notify({
      pravnoLiceId: opp.pravnoLiceId,
      korisnikId: opp.vlasnikId,
      tip: "OPP_ZAPEO",
      poruka: `Opportunity "${opp.naziv}" nije ažuriran > ${STALE_DAYS} dana (stage: ${opp.stage.kod})`,
      linkUrl: `/opportunities/${opp.id}`,
    });
  }
  // eslint-disable-next-line no-console
  console.log(`Notified on ${stale.length} stale opportunities`);
}

run().finally(() => prisma.$disconnect());

/**
 * Cron job: detektuje komunalne naknade čiji rok ističe u narednih N dana
 * i šalje KOMUNALNA_ISTEKLA notifikaciju Country Manager-u + Finance-u.
 * PZ 4.8 + 4.12.
 */
import { prisma } from "../../src/lib/prisma";
import { notifyRoles } from "../../src/server/services/notify";

const DAYS_BEFORE = Number(process.env.COMMUNAL_NOTIFY_DAYS ?? 14);

async function run() {
  const now = new Date();
  const cutoff = new Date(now.getTime() + DAYS_BEFORE * 86400000);
  const nakndade = await prisma.komunalnaNaknada.findMany({
    where: {
      statusPlacanja: { in: ["NEPLACENO", "DELIMICNO"] },
      doDatum: { lte: cutoff, gte: now },
    },
    include: { vozilo: true },
  });

  for (const k of nakndade) {
    await notifyRoles({
      pravnoLiceId: k.vozilo.pravnoLiceId,
      rolaKodovi: ["COUNTRY_MANAGER", "FINANCE", "ADMIN"],
      tip: "KOMUNALNA_ISTEKLA",
      poruka: `Komunalna naknada za vozilo ${k.vozilo.registracija} ističe ${k.doDatum.toISOString().slice(0, 10)} (${k.iznos} ${k.valuta})`,
      linkUrl: `/vehicles/${k.voziloId}`,
    });
  }
  // eslint-disable-next-line no-console
  console.log(`Checked ${nakndade.length} expiring communal fees`);
}

run().finally(() => prisma.$disconnect());

import { DokumentTip } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const PREFIX: Record<DokumentTip, string> = {
  PREDRACUN: "PRE",
  FAKTURA: "INV",
  AVANS: "ADV",
  STORNO: "CRN",
};

/**
 * ADR-0003. Atomski sledeći broj per (pravnoLice, tip, godina).
 * Postgres ROW-level lock kroz SELECT ... FOR UPDATE u transakciji.
 */
export async function generateInvoiceNumber(pravnoLiceId: string, tip: DokumentTip, godina: number): Promise<string> {
  const pl = await prisma.pravnoLice.findUnique({ where: { id: pravnoLiceId } });
  if (!pl) throw new Error("Pravno lice ne postoji");

  const next = await prisma.$transaction(async (tx) => {
    const row = await tx.numeracijaSkok.upsert({
      where: { pravnoLiceId_tip_godina: { pravnoLiceId, tip, godina } },
      update: { poslednjiRbr: { increment: 1 } },
      create: { pravnoLiceId, tip, godina, poslednjiRbr: 1 },
    });
    return row.poslednjiRbr;
  });

  return `${PREFIX[tip]}-${pl.kod}-${godina}-${String(next).padStart(6, "0")}`;
}

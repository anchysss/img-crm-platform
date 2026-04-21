import type { Dokument, HandoffFormat } from "@prisma/client";
import { promises as fs } from "node:fs";
import path from "node:path";

interface HandoffOutput {
  uri: string; // file://... ili sftp://...
  perDocument: Record<string, unknown>;
}

/**
 * Format izvoza po zemlji. MVP: svi formati dele istu osnovnu JSON strukturu
 * + specifični omotač. Prava fiskalna XSD se ugrađuje u kasnijoj fazi (ADR-0003, PZ 4.11).
 */
export async function generateHandoffFile(format: HandoffFormat, plKod: string, dokumenti: Dokument[]): Promise<HandoffOutput> {
  const perDocument: Record<string, unknown> = {};
  const wrappers: unknown[] = [];

  for (const d of dokumenti) {
    const common = {
      broj: d.broj,
      tip: d.tip,
      datum: d.datum,
      partnerId: d.partnerId,
      podzbir: d.podzbir.toString(),
      pdv: d.pdv.toString(),
      ukupno: d.ukupno.toString(),
      valuta: d.valuta,
      status: d.status,
    };
    switch (format) {
      case "SRB_SEF":
        perDocument[d.id] = { ...common, sefEnvelope: { schemaVersion: "2.0", sender: "IMG_SRB" } };
        break;
      case "HRV_FINA":
        perDocument[d.id] = { ...common, finaEnvelope: { eracunSchema: "UBL2.1" } };
        break;
      case "MNE_STD":
        perDocument[d.id] = { ...common, mneEnvelope: { version: "1.0" } };
        break;
      case "BIH_STD":
        perDocument[d.id] = { ...common, bihEnvelope: { version: "1.0" } };
        break;
    }
    wrappers.push(perDocument[d.id]);
  }

  // MVP: upisujemo u lokalni /tmp/handoff dir; u produkciji SFTP/S3.
  const dir = path.join(process.env.HANDOFF_DIR ?? "/tmp/img-handoff", plKod);
  await fs.mkdir(dir, { recursive: true });
  const fileName = `handoff-${plKod}-${Date.now()}.json`;
  const fullPath = path.join(dir, fileName);
  await fs.writeFile(fullPath, JSON.stringify({ format, generatedAt: new Date().toISOString(), documents: wrappers }, null, 2), "utf-8");
  return { uri: `file://${fullPath}`, perDocument };
}

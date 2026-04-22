import { describe, it, expect } from "vitest";
import { generateHandoffFile } from "@/server/services/handoff";
import { Decimal } from "@prisma/client/runtime/library";

function mockDoc(over: Partial<any> = {}) {
  return {
    id: "d1",
    broj: "INV-MNE-2026-000001",
    tip: "FAKTURA",
    datum: new Date("2026-04-01"),
    partnerId: "p1",
    podzbir: new Decimal("1000"),
    pdv: new Decimal("210"),
    ukupno: new Decimal("1210"),
    valuta: "EUR",
    status: "OTVOREN",
    ...over,
  } as any;
}

describe("handoff generator", () => {
  it("SRB_SEF wraps with SEF envelope", async () => {
    const r = await generateHandoffFile("SRB_SEF", "SRB", [mockDoc()]);
    expect(r.uri).toMatch(/^file:\/\//);
    expect(r.perDocument["d1"]).toMatchObject({
      broj: "INV-MNE-2026-000001",
      sefEnvelope: { schemaVersion: "2.0", sender: "IMG_SRB" },
    });
  });

  it("HRV_FINA wraps with Fina eRacun envelope", async () => {
    const r = await generateHandoffFile("HRV_FINA", "HRV", [mockDoc()]);
    expect(r.perDocument["d1"]).toMatchObject({ finaEnvelope: { eracunSchema: "UBL2.1" } });
  });

  it("MNE_STD wraps with MNE envelope", async () => {
    const r = await generateHandoffFile("MNE_STD", "MNE", [mockDoc()]);
    expect(r.perDocument["d1"]).toMatchObject({ mneEnvelope: { version: "1.0" } });
  });

  it("BIH_STD wraps with BIH envelope", async () => {
    const r = await generateHandoffFile("BIH_STD", "BIH", [mockDoc()]);
    expect(r.perDocument["d1"]).toMatchObject({ bihEnvelope: { version: "1.0" } });
  });
});

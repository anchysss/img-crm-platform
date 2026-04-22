import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { generateInvoiceNumber } from "@/server/services/numeration";

/**
 * Integration test: proverava da je sekvenca fakture atomska per (pravnoLice, tip, godina).
 * Traži DATABASE_URL — pokreće se kroz DB servis u CI-u.
 */
const prisma = new PrismaClient();
const year = 2999;

describe("invoice numeration (integration)", () => {
  let plId: string;

  beforeAll(async () => {
    const pl = await prisma.pravnoLice.findFirst({ where: { kod: "MNE" } });
    if (!pl) throw new Error("Seed DB first: pravnoLice MNE not found");
    plId = pl.id;
    // Wipe any previous test year counter
    await prisma.numeracijaSkok.deleteMany({ where: { pravnoLiceId: plId, godina: year } });
  });

  afterAll(async () => {
    await prisma.numeracijaSkok.deleteMany({ where: { pravnoLiceId: plId, godina: year } });
    await prisma.$disconnect();
  });

  it("generates sequential numbers under concurrent calls", async () => {
    const results = await Promise.all([
      generateInvoiceNumber(plId, "FAKTURA", year),
      generateInvoiceNumber(plId, "FAKTURA", year),
      generateInvoiceNumber(plId, "FAKTURA", year),
      generateInvoiceNumber(plId, "FAKTURA", year),
      generateInvoiceNumber(plId, "FAKTURA", year),
    ]);
    const numbers = results.map((r) => Number(r.slice(-6)));
    const sorted = [...numbers].sort((a, b) => a - b);
    expect(sorted).toEqual([1, 2, 3, 4, 5]);
    expect(new Set(numbers).size).toBe(numbers.length); // svi jedinstveni
    expect(results.every((r) => /^INV-MNE-2999-\d{6}$/.test(r))).toBe(true);
  });

  it("uses independent sequence per tip", async () => {
    const pre = await generateInvoiceNumber(plId, "PREDRACUN", year);
    const adv = await generateInvoiceNumber(plId, "AVANS", year);
    expect(pre.startsWith("PRE-MNE-")).toBe(true);
    expect(adv.startsWith("ADV-MNE-")).toBe(true);
    expect(pre.slice(-6)).toBe("000001");
    expect(adv.slice(-6)).toBe("000001");
  });
});

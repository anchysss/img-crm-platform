import { describe, it, expect, vi } from "vitest";

let counter = 0;

vi.mock("@/lib/prisma", () => {
  const mock: any = {
    pravnoLice: {
      findUnique: vi.fn(async () => ({ id: "pl1", kod: "MNE" })),
    },
    numeracijaSkok: {
      upsert: vi.fn(async () => ({ poslednjiRbr: ++counter })),
    },
    $transaction: vi.fn(async (fn: any) => fn(mock)),
  };
  return { prisma: mock };
});

import { generateInvoiceNumber } from "@/server/services/numeration";

describe("generateInvoiceNumber", () => {
  it("produces incrementing, zero-padded numbers in ADR-0003 format", async () => {
    const a = await generateInvoiceNumber("pl1", "FAKTURA", 2026);
    const b = await generateInvoiceNumber("pl1", "FAKTURA", 2026);
    expect(a).toMatch(/^INV-MNE-2026-\d{6}$/);
    expect(b).toMatch(/^INV-MNE-2026-\d{6}$/);
    expect(Number(b.slice(-6))).toBeGreaterThan(Number(a.slice(-6)));
  });
});

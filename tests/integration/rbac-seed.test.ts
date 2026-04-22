import { describe, it, expect, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

describe("seeded RBAC (integration)", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("seeded all 6 roles", async () => {
    const roles = await prisma.rola.findMany();
    expect(roles.map((r) => r.kod).sort()).toEqual(
      ["ADMIN", "COUNTRY_MANAGER", "FINANCE", "READ_ONLY", "SALES_MANAGER", "SALES_REP"],
    );
  });

  it("ADMIN has invoice APPROVE permission", async () => {
    const admin = await prisma.rola.findUnique({ where: { kod: "ADMIN" }, include: { dozvole: true } });
    expect(admin?.dozvole.some((d) => d.modul === "invoices" && d.akcija === "APPROVE")).toBe(true);
  });

  it("READ_ONLY cannot CREATE partners", async () => {
    const ro = await prisma.rola.findUnique({ where: { kod: "READ_ONLY" }, include: { dozvole: true } });
    expect(ro?.dozvole.some((d) => d.modul === "partners" && d.akcija === "CREATE")).toBe(false);
  });

  it("each pravno lice has its own users", async () => {
    const counts = await prisma.pravnoLice.findMany({ include: { _count: { select: { korisnici: true } } } });
    const mne = counts.find((p) => p.kod === "MNE");
    const srb = counts.find((p) => p.kod === "SRB");
    expect((mne?._count.korisnici ?? 0)).toBeGreaterThan(0);
    expect((srb?._count.korisnici ?? 0)).toBeGreaterThan(0);
  });
});

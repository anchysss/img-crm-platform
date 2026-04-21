import { describe, it, expect, vi, beforeEach } from "vitest";
import { hasRole, requirePermission, type SessionCtx } from "@/server/rbac";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    dozvola: {
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mkCtx = (overrides: Partial<SessionCtx> = {}): SessionCtx => ({
  korisnikId: "k1",
  email: "u@test",
  tenantId: "t1",
  roles: [{ rola: "SALES_REP", pravnoLiceId: "t1" }],
  ...overrides,
});

describe("rbac", () => {
  beforeEach(() => vi.clearAllMocks());

  it("hasRole matches any of provided", () => {
    expect(hasRole(mkCtx(), "SALES_REP")).toBe(true);
    expect(hasRole(mkCtx(), "ADMIN")).toBe(false);
    expect(hasRole(mkCtx({ roles: [{ rola: "ADMIN", pravnoLiceId: "t1" }] }), "ADMIN")).toBe(true);
  });

  it("requirePermission passes when permission exists", async () => {
    (prisma.dozvola.findFirst as any).mockResolvedValue({ id: "d1" });
    await expect(requirePermission(mkCtx(), "partners", "READ")).resolves.toBeUndefined();
  });

  it("requirePermission throws when missing", async () => {
    (prisma.dozvola.findFirst as any).mockResolvedValue(null);
    await expect(requirePermission(mkCtx(), "audit_log", "EXPORT")).rejects.toThrow(/Nema dozvole/);
  });

  it("requirePermission rejects when user has no role in target tenant", async () => {
    await expect(requirePermission(mkCtx(), "partners", "READ", "t-other")).rejects.toThrow(/Nema pristupa/);
  });
});

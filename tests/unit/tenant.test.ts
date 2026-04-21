import { describe, it, expect } from "vitest";
import { ensureTenant, tenantWhere } from "@/server/tenant";
import type { SessionCtx } from "@/server/rbac";

const rep: SessionCtx = {
  korisnikId: "k",
  email: "u",
  tenantId: "t-mne",
  roles: [{ rola: "SALES_REP", pravnoLiceId: "t-mne" }],
};
const admin: SessionCtx = {
  korisnikId: "k",
  email: "a",
  tenantId: "t-mne",
  roles: [{ rola: "ADMIN", pravnoLiceId: "t-mne" }],
};

describe("tenant helpers", () => {
  it("tenantWhere returns current tenant filter", () => {
    expect(tenantWhere(rep)).toEqual({ pravnoLiceId: "t-mne" });
  });

  it("ensureTenant passes for same tenant", () => {
    expect(() => ensureTenant(rep, "t-mne")).not.toThrow();
  });

  it("ensureTenant throws for cross-tenant access", () => {
    expect(() => ensureTenant(rep, "t-srb")).toThrow(/Tenant mismatch/);
  });

  it("ensureTenant allows Admin override only when explicitly requested", () => {
    expect(() => ensureTenant(admin, "t-srb")).toThrow();
    expect(() => ensureTenant(admin, "t-srb", true)).not.toThrow();
  });
});

import { AppError } from "./errors";
import type { SessionCtx } from "./rbac";

/**
 * ADR-0002 — svi upiti prolaze kroz ovaj helper. Garantuje da `where.pravnoLiceId`
 * matchuje sesiju, osim kada Admin eksplicitno traži `tenantOverride`.
 */
export function ensureTenant(ctx: SessionCtx, target: string, allowAdminOverride = false) {
  if (ctx.tenantId === target) return;
  if (allowAdminOverride && ctx.roles.some((r) => r.rola === "ADMIN")) return;
  throw new AppError("FORBIDDEN", `Tenant mismatch: session=${ctx.tenantId}, requested=${target}`);
}

export function tenantWhere(ctx: SessionCtx) {
  return { pravnoLiceId: ctx.tenantId };
}

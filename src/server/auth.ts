import { hash, verify } from "@node-rs/argon2";
import { authenticator } from "otplib";
import { prisma } from "@/lib/prisma";
import { AppError } from "./errors";
import { rateLimit } from "./rate-limit";
import { audit } from "./audit";
import type { SessionCtx } from "./rbac";

export async function hashPassword(pw: string) {
  return hash(pw);
}

export async function verifyPassword(hashStr: string, pw: string) {
  try {
    return await verify(hashStr, pw);
  } catch {
    return false;
  }
}

export async function authenticate(email: string, password: string, ip?: string, userAgent?: string): Promise<SessionCtx> {
  const rl = rateLimit(`login:${ip ?? email}`, 5, 15 * 60 * 1000);
  if (!rl.ok) throw new AppError("RATE_LIMIT", `Previše pokušaja, pokušajte za ${Math.ceil(rl.retryAfterMs / 1000)}s`);

  const user = await prisma.korisnik.findUnique({
    where: { email },
    include: {
      roles: { include: { rola: true } },
    },
  });
  if (!user || !user.aktivan || user.deletedAt) {
    await audit({ entitet: "Korisnik", entitetId: email, akcija: "LOGIN_FAILED", ip, userAgent, diff: { reason: "not_found_or_inactive" } });
    throw new AppError("UNAUTHORIZED", "Pogrešan email ili lozinka");
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AppError("UNAUTHORIZED", "Nalog privremeno zaključan");
  }

  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) {
    const failedLoginAttempts = user.failedLoginAttempts + 1;
    await prisma.korisnik.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts,
        lockedUntil: failedLoginAttempts >= 10 ? new Date(Date.now() + 30 * 60 * 1000) : null,
      },
    });
    await audit({ entitet: "Korisnik", entitetId: user.id, akcija: "LOGIN_FAILED", ip, userAgent });
    throw new AppError("UNAUTHORIZED", "Pogrešan email ili lozinka");
  }

  await prisma.korisnik.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  });

  const tenantId = user.roles[0]?.pravnoLiceId;
  if (!tenantId) throw new AppError("FORBIDDEN", "Korisnik nema ni jednu dodeljenu rolu");

  await audit({ pravnoLiceId: tenantId, entitet: "Korisnik", entitetId: user.id, akcija: "LOGIN", ip, userAgent });

  return {
    korisnikId: user.id,
    email: user.email,
    tenantId,
    roles: user.roles.map((kr) => ({ rola: kr.rola.kod, pravnoLiceId: kr.pravnoLiceId })),
  };
}

export function generateTotpSecret(email: string) {
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(email, "IMG CRM", secret);
  return { secret, otpauth };
}

export function verifyTotp(secret: string, token: string): boolean {
  return authenticator.check(token, secret);
}

export function requires2FA(userRoles: Array<{ rola: string }>) {
  return userRoles.some((r) => ["ADMIN", "COUNTRY_MANAGER", "FINANCE"].includes(r.rola));
}

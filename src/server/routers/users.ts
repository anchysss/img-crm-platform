import { z } from "zod";
import { router, withPermission, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { audit } from "../audit";
import { AppError } from "../errors";
import { hashPassword, generateTotpSecret, verifyTotp } from "../auth";
import { RolaKod } from "@prisma/client";

export const usersRouter = router({
  list: withPermission("users", "READ").query(async () => {
    return prisma.korisnik.findMany({
      where: { deletedAt: null },
      include: { roles: { include: { rola: true, pravnoLice: true } } },
      orderBy: { email: "asc" },
    });
  }),

  create: withPermission("users", "CREATE").input(
    z.object({
      email: z.string().email(),
      ime: z.string().min(1),
      prezime: z.string().min(1),
      password: z.string().min(8),
      rolaKod: z.nativeEnum(RolaKod),
      pravnoLiceId: z.string().cuid(),
      twoFaEnabled: z.boolean().default(false),
    }),
  ).mutation(async ({ input, ctx }) => {
    const existing = await prisma.korisnik.findUnique({ where: { email: input.email } });
    if (existing) throw new AppError("CONFLICT", "Email već postoji");
    const rola = await prisma.rola.findUnique({ where: { kod: input.rolaKod } });
    if (!rola) throw new AppError("VALIDATION", "Nepoznata rola");
    const created = await prisma.korisnik.create({
      data: {
        email: input.email,
        ime: input.ime,
        prezime: input.prezime,
        passwordHash: await hashPassword(input.password),
        twoFaEnabled: input.twoFaEnabled,
        roles: {
          create: { rolaId: rola.id, pravnoLiceId: input.pravnoLiceId },
        },
      },
    });
    await audit({ ctx: ctx.session, entitet: "Korisnik", entitetId: created.id, akcija: "CREATE", diff: { email: input.email, rola: input.rolaKod } });
    return { id: created.id, email: created.email };
  }),

  setActive: withPermission("users", "UPDATE").input(z.object({ id: z.string().cuid(), aktivan: z.boolean() })).mutation(async ({ input, ctx }) => {
    const updated = await prisma.korisnik.update({ where: { id: input.id }, data: { aktivan: input.aktivan } });
    await audit({ ctx: ctx.session, entitet: "Korisnik", entitetId: input.id, akcija: "UPDATE", diff: { aktivan: input.aktivan } });
    return updated;
  }),

  resetPassword: withPermission("users", "UPDATE").input(z.object({ id: z.string().cuid(), password: z.string().min(8) })).mutation(async ({ input, ctx }) => {
    await prisma.korisnik.update({ where: { id: input.id }, data: { passwordHash: await hashPassword(input.password), failedLoginAttempts: 0, lockedUntil: null } });
    await audit({ ctx: ctx.session, entitet: "Korisnik", entitetId: input.id, akcija: "UPDATE", diff: { passwordReset: true } });
    return { ok: true };
  }),

  // Endpoint za trenutnog korisnika — početak 2FA setup-a
  beginTwoFaSetup: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await prisma.korisnik.findUnique({ where: { id: ctx.session!.korisnikId } });
    if (!user) throw new AppError("NOT_FOUND", "Korisnik ne postoji");
    const { secret, otpauth } = generateTotpSecret(user.email);
    await prisma.korisnik.update({ where: { id: user.id }, data: { twoFaSecret: secret } });
    return { otpauth, secret };
  }),

  confirmTwoFa: protectedProcedure.input(z.object({ token: z.string().length(6) })).mutation(async ({ ctx, input }) => {
    const user = await prisma.korisnik.findUnique({ where: { id: ctx.session!.korisnikId } });
    if (!user?.twoFaSecret) throw new AppError("VALIDATION", "Nije započet 2FA setup");
    if (!verifyTotp(user.twoFaSecret, input.token)) throw new AppError("UNAUTHORIZED", "Pogrešan token");
    await prisma.korisnik.update({ where: { id: user.id }, data: { twoFaEnabled: true } });
    await audit({ ctx: ctx.session, entitet: "Korisnik", entitetId: user.id, akcija: "UPDATE", diff: { twoFaEnabled: true } });
    return { ok: true };
  }),

  disableTwoFa: withPermission("users", "UPDATE").input(z.object({ id: z.string().cuid() })).mutation(async ({ input, ctx }) => {
    await prisma.korisnik.update({ where: { id: input.id }, data: { twoFaEnabled: false, twoFaSecret: null } });
    await audit({ ctx: ctx.session, entitet: "Korisnik", entitetId: input.id, akcija: "UPDATE", diff: { twoFaDisabled: true } });
    return { ok: true };
  }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.korisnik.findUnique({
      where: { id: ctx.session!.korisnikId },
      include: { roles: { include: { rola: true, pravnoLice: true } } },
    });
    return user;
  }),
});

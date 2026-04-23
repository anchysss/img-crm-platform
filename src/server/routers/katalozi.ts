import { z } from "zod";
import { router, withPermission, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { tenantWhere, ensureTenant } from "../tenant";
import { audit } from "../audit";
import { AppError } from "../errors";
import { TipOglasa, JedinicaMere } from "@prisma/client";

// Zajednički router za Cenovnik, Pakete, Kategorije delatnosti
export const kataloziRouter = router({
  // ===== Kategorije delatnosti =====
  kategorijeList: withPermission("partners", "READ").query(async ({ ctx }) => {
    return prisma.kategorijaDelatnosti.findMany({
      where: { ...tenantWhere(ctx.session!), aktivna: true },
      orderBy: { naziv: "asc" },
    });
  }),

  kategorijaCreate: withPermission("system_settings", "CREATE").input(
    z.object({ kod: z.string().min(1), naziv: z.string().min(1), opis: z.string().optional() }),
  ).mutation(async ({ ctx, input }) => {
    const created = await prisma.kategorijaDelatnosti.create({
      data: { ...input, pravnoLiceId: ctx.session!.tenantId },
    });
    await audit({ ctx: ctx.session, entitet: "KategorijaDelatnosti", entitetId: created.id, akcija: "CREATE" });
    return created;
  }),

  // ===== Cenovnik =====
  cenovnikList: protectedProcedure.query(async ({ ctx }) => {
    return prisma.cenovnik.findMany({
      where: { ...tenantWhere(ctx.session!), aktivan: true },
      orderBy: [{ tipOglasa: "asc" }, { naziv: "asc" }],
    });
  }),

  cenovnikCreate: withPermission("system_settings", "CREATE").input(
    z.object({
      kod: z.string().min(1),
      naziv: z.string().min(1),
      tipOglasa: z.nativeEnum(TipOglasa),
      jedinicaMere: z.nativeEnum(JedinicaMere).default(JedinicaMere.PER_WEEK),
      cena: z.string(),
      valuta: z.string().length(3),
      vaziOd: z.coerce.date().optional(),
      vaziDo: z.coerce.date().optional(),
      opis: z.string().optional(),
    }),
  ).mutation(async ({ ctx, input }) => {
    const created = await prisma.cenovnik.create({
      data: { ...input, pravnoLiceId: ctx.session!.tenantId },
    });
    await audit({ ctx: ctx.session, entitet: "Cenovnik", entitetId: created.id, akcija: "CREATE", diff: { kod: input.kod, cena: input.cena } });
    return created;
  }),

  cenovnikUpdate: withPermission("system_settings", "UPDATE").input(
    z.object({
      id: z.string().cuid(),
      naziv: z.string().optional(),
      cena: z.string().optional(),
      aktivan: z.boolean().optional(),
      vaziDo: z.coerce.date().optional(),
    }),
  ).mutation(async ({ ctx, input }) => {
    const { id, ...rest } = input;
    const existing = await prisma.cenovnik.findUnique({ where: { id } });
    if (!existing) throw new AppError("NOT_FOUND", "Cenovnik stavka ne postoji");
    ensureTenant(ctx.session!, existing.pravnoLiceId);
    const updated = await prisma.cenovnik.update({ where: { id }, data: rest });
    await audit({ ctx: ctx.session, entitet: "Cenovnik", entitetId: id, akcija: "UPDATE", diff: rest });
    return updated;
  }),

  // ===== Paketi =====
  paketiList: protectedProcedure.input(z.object({ grad: z.string().optional() }).optional()).query(async ({ ctx, input }) => {
    return prisma.paket.findMany({
      where: {
        ...tenantWhere(ctx.session!),
        aktivan: true,
        ...(input?.grad ? { grad: input.grad } : {}),
      },
      orderBy: [{ grad: "asc" }, { brojVozila: "asc" }],
    });
  }),

  paketCreate: withPermission("system_settings", "CREATE").input(
    z.object({
      kod: z.string().min(1),
      naziv: z.string().min(1),
      grad: z.string().min(1),
      tipOglasa: z.nativeEnum(TipOglasa),
      brojVozila: z.number().int().positive(),
      minTrajanjeDana: z.number().int().positive().default(14),
      cena: z.string(),
      valuta: z.string().length(3),
      opis: z.string().optional(),
    }),
  ).mutation(async ({ ctx, input }) => {
    const created = await prisma.paket.create({
      data: { ...input, pravnoLiceId: ctx.session!.tenantId },
    });
    await audit({ ctx: ctx.session, entitet: "Paket", entitetId: created.id, akcija: "CREATE" });
    return created;
  }),
});

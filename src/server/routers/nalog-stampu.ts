import { z } from "zod";
import { router, withPermission } from "../trpc";
import { prisma } from "@/lib/prisma";
import { tenantWhere, ensureTenant } from "../tenant";
import { audit } from "../audit";
import { AppError } from "../errors";
import { StamparijaTip, MaterijalTip, NalogStavkaStatus, TipStampe } from "@prisma/client";

const stavkaInput = z.object({
  redniBr: z.coerce.number().int().optional(),
  grad: z.string().min(1),
  resenjeId: z.string().cuid().optional(),
  resenjeOznaka: z.string().optional(),
  simpleks: z.boolean().default(true),
  // HIGER kolone
  fileNaziv: z.string().optional(),
  formatX: z.coerce.number().optional(),
  formatY: z.coerce.number().optional(),
  // Lookup FK
  folijaId: z.string().cuid().optional(),
  doradaId: z.string().cuid().optional(),
  // Legacy / fallback
  format: z.string().min(1),
  tiraz: z.coerce.number().int().min(1),
  materijal: z.nativeEnum(MaterijalTip),
  gramatura: z.string().optional(),
  dorada: z.string().optional(),
  cenaJedinicna: z.coerce.number().optional(),
  cenaUkupno: z.coerce.number().optional(),
  napomena: z.string().optional(),
});

export const nalogStampuRouter = router({
  list: withPermission("campaigns", "READ").input(
    z.object({ radniNalogId: z.string().cuid().optional() }).optional(),
  ).query(async ({ ctx, input }) => {
    return prisma.nalogStampu.findMany({
      where: { ...tenantWhere(ctx.session!), ...(input?.radniNalogId ? { radniNalogId: input.radniNalogId } : {}) },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { stavke: true } } },
      take: 200,
    });
  }),

  byId: withPermission("campaigns", "READ").input(z.object({ id: z.string().cuid() })).query(async ({ ctx, input }) => {
    const n = await prisma.nalogStampu.findUnique({
      where: { id: input.id },
      include: {
        radniNalog: true,
        masinaRef: true,
        stavke: {
          include: {
            resenje: { select: { id: true, oznaka: true } },
            folijaRef: { select: { id: true, naziv: true } },
            doradaRef: { select: { id: true, naziv: true } },
          },
          orderBy: { redniBr: "asc" },
        },
      },
    });
    if (!n) return null;
    ensureTenant(ctx.session!, n.pravnoLiceId);
    const partner = await prisma.partner.findUnique({ where: { id: n.radniNalog.partnerId } });
    return { ...n, radniNalog: { ...n.radniNalog, partner } };
  }),

  create: withPermission("campaigns", "CREATE").input(
    z.object({
      radniNalogId: z.string().cuid(),
      kampanjaNaziv: z.string().optional(),
      stamparija: z.nativeEnum(StamparijaTip),
      tipStampe: z.nativeEnum(TipStampe).default("REDOVNA"),
      datumPredaje: z.coerce.date(),
      rokIzrade: z.coerce.date(),
      rokIzradeTime: z.string().optional(),
      masinaId: z.string().cuid().optional(),
      masina: z.string().optional(),
      rnStamparije: z.string().optional(),
      napomena: z.string().optional(),
      stavke: z.array(stavkaInput).default([]),
    }),
  ).mutation(async ({ ctx, input }) => {
    const rn = await prisma.radniNalog.findUnique({ where: { id: input.radniNalogId } });
    if (!rn) throw new AppError("NOT_FOUND", "Radni nalog ne postoji");
    ensureTenant(ctx.session!, rn.pravnoLiceId);

    const cnt = await prisma.nalogStampu.count({ where: { radniNalogId: input.radniNalogId } });
    const sufixStamparija =
      input.stamparija === "DPC_BEOGRAD" ? "-DPC" :
      input.stamparija === "STAMPARIJA_NIS" ? "-NIS" : "-DRUGA";
    const sufixTip = input.tipStampe === "PROBNA" ? "-PROBA" : "";
    const broj = `${rn.broj}-STAMPA${sufixStamparija}${sufixTip}-${cnt + 1}`;

    const created = await prisma.nalogStampu.create({
      data: {
        pravnoLiceId: rn.pravnoLiceId,
        radniNalogId: input.radniNalogId,
        broj,
        kampanjaNaziv: input.kampanjaNaziv,
        stamparija: input.stamparija,
        tipStampe: input.tipStampe,
        datumPredaje: input.datumPredaje,
        rokIzrade: input.rokIzrade,
        rokIzradeTime: input.rokIzradeTime,
        masinaId: input.masinaId,
        masina: input.masina,
        rnStamparije: input.rnStamparije,
        napomena: input.napomena,
        stavke: { create: input.stavke.map((s, i) => ({ ...s, redniBr: s.redniBr ?? i + 1 })) },
      },
      include: { stavke: true },
    });
    await audit({ ctx: ctx.session, entitet: "NalogStampu", entitetId: created.id, akcija: "CREATE", diff: { broj, stamparija: input.stamparija } });
    return created;
  }),

  update: withPermission("campaigns", "UPDATE").input(
    z.object({
      id: z.string().cuid(),
      kampanjaNaziv: z.string().optional(),
      masinaId: z.string().cuid().optional().nullable(),
      rnStamparije: z.string().optional(),
      napomena: z.string().optional(),
      rokIzradeTime: z.string().optional(),
    }),
  ).mutation(async ({ ctx, input }) => {
    const n = await prisma.nalogStampu.findUnique({ where: { id: input.id } });
    if (!n) throw new AppError("NOT_FOUND", "Nalog ne postoji");
    ensureTenant(ctx.session!, n.pravnoLiceId);
    const { id, ...rest } = input;
    return prisma.nalogStampu.update({ where: { id }, data: rest });
  }),

  addStavka: withPermission("campaigns", "UPDATE").input(
    stavkaInput.extend({ nalogId: z.string().cuid() }),
  ).mutation(async ({ ctx, input }) => {
    const n = await prisma.nalogStampu.findUnique({ where: { id: input.nalogId } });
    if (!n) throw new AppError("NOT_FOUND", "Nalog ne postoji");
    ensureTenant(ctx.session!, n.pravnoLiceId);
    const { nalogId, ...rest } = input;
    const cnt = await prisma.nalogStampuStavka.count({ where: { nalogId } });
    return prisma.nalogStampuStavka.create({ data: { nalogId, redniBr: rest.redniBr ?? cnt + 1, ...rest } });
  }),

  removeStavka: withPermission("campaigns", "UPDATE").input(
    z.object({ stavkaId: z.string().cuid() }),
  ).mutation(async ({ ctx, input }) => {
    const s = await prisma.nalogStampuStavka.findUnique({ where: { id: input.stavkaId }, include: { nalog: true } });
    if (!s) throw new AppError("NOT_FOUND", "Stavka ne postoji");
    ensureTenant(ctx.session!, s.nalog.pravnoLiceId);
    await prisma.nalogStampuStavka.delete({ where: { id: input.stavkaId } });
    return { ok: true };
  }),

  setStatus: withPermission("campaigns", "UPDATE").input(
    z.object({ id: z.string().cuid(), status: z.nativeEnum(NalogStavkaStatus) }),
  ).mutation(async ({ ctx, input }) => {
    const n = await prisma.nalogStampu.findUnique({ where: { id: input.id } });
    if (!n) throw new AppError("NOT_FOUND", "Nalog ne postoji");
    ensureTenant(ctx.session!, n.pravnoLiceId);
    return prisma.nalogStampu.update({ where: { id: input.id }, data: { status: input.status } });
  }),

  remove: withPermission("campaigns", "DELETE").input(
    z.object({ id: z.string().cuid() }),
  ).mutation(async ({ ctx, input }) => {
    const n = await prisma.nalogStampu.findUnique({ where: { id: input.id } });
    if (!n) throw new AppError("NOT_FOUND", "Nalog ne postoji");
    ensureTenant(ctx.session!, n.pravnoLiceId);
    await prisma.nalogStampu.delete({ where: { id: input.id } });
    return { ok: true };
  }),

  cenovnik: withPermission("campaigns", "READ").input(
    z.object({ stamparija: z.nativeEnum(StamparijaTip) }).optional(),
  ).query(async ({ ctx, input }) => {
    return prisma.stamparijaCenovnik.findMany({
      where: {
        pravnoLiceId: ctx.session!.tenantId,
        aktivan: true,
        ...(input?.stamparija ? { stamparija: input.stamparija } : {}),
      },
      orderBy: [{ stamparija: "asc" }, { format: "asc" }],
    });
  }),
});

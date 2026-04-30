import { z } from "zod";
import { router, withPermission } from "../trpc";
import { prisma } from "@/lib/prisma";
import { tenantWhere, ensureTenant } from "../tenant";
import { audit } from "../audit";
import { AppError } from "../errors";
import { NalogMontazuTip, NalogStavkaStatus } from "@prisma/client";

const stavkaInput = z.object({
  redniBr: z.coerce.number().int().optional(),
  voziloId: z.string().cuid().optional(),
  garazniBroj: z.string().optional(),
  garaza: z.string().optional(),
  linija: z.string().optional(),
  tipVozila: z.string().optional(),
  resenjeId: z.string().cuid().optional(),
  sifraRasporeda: z.string().optional(),
  brojPanoa: z.any().optional(),
  // Iz primer xlsx
  skidanjeM2: z.coerce.number().optional(),
  montazaM2: z.coerce.number().optional(),
  rnStamparije: z.string().optional(),
  napomena: z.string().optional(),
});

export const nalogMontazuRouter = router({
  list: withPermission("campaigns", "READ").input(
    z.object({ radniNalogId: z.string().cuid().optional() }).optional(),
  ).query(async ({ ctx, input }) => {
    return prisma.nalogMontazu.findMany({
      where: { ...tenantWhere(ctx.session!), ...(input?.radniNalogId ? { radniNalogId: input.radniNalogId } : {}) },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { stavke: true } } },
      take: 200,
    });
  }),

  byId: withPermission("campaigns", "READ").input(z.object({ id: z.string().cuid() })).query(async ({ ctx, input }) => {
    const n = await prisma.nalogMontazu.findUnique({
      where: { id: input.id },
      include: {
        radniNalog: true,
        montazerRef: true,
        masinaRef: true,
        stavke: {
          include: {
            vozilo: { select: { id: true, sifra: true, registracija: true, model: true, garaza: true, tipVozilaTxt: true } },
            resenje: { select: { id: true, oznaka: true, procenat: true } },
          },
          orderBy: { redniBr: "asc" },
        },
      },
    });
    if (!n) return null;
    ensureTenant(ctx.session!, n.pravnoLiceId);
    const [partner, opportunity] = await Promise.all([
      prisma.partner.findUnique({ where: { id: n.radniNalog.partnerId } }),
      n.radniNalog.opportunityId ? prisma.opportunity.findUnique({ where: { id: n.radniNalog.opportunityId } }) : null,
    ]);
    return { ...n, radniNalog: { ...n.radniNalog, partner, opportunity } };
  }),

  create: withPermission("campaigns", "CREATE").input(
    z.object({
      radniNalogId: z.string().cuid(),
      tip: z.nativeEnum(NalogMontazuTip),
      grad: z.string().optional(),
      ekipa: z.string().optional(),
      montazerId: z.string().cuid().optional(),
      prevoznikNaziv: z.string().optional(),
      masinaId: z.string().cuid().optional(),
      datumMontaze: z.coerce.date().optional(),
      vremeMontaze: z.string().optional(),
      napomena: z.string().optional(),
      stavke: z.array(stavkaInput).default([]),
    }),
  ).mutation(async ({ ctx, input }) => {
    const rn = await prisma.radniNalog.findUnique({ where: { id: input.radniNalogId } });
    if (!rn) throw new AppError("NOT_FOUND", "Radni nalog ne postoji");
    ensureTenant(ctx.session!, rn.pravnoLiceId);

    const cnt = await prisma.nalogMontazu.count({ where: { radniNalogId: input.radniNalogId } });
    const sufixGrad = input.tip === "GRADOVI" && input.grad ? `-${input.grad.toUpperCase()}` : input.tip === "BEOGRAD" ? "-BG" : "";
    const broj = `${rn.broj}-MONTAZA${sufixGrad}-${cnt + 1}`;

    const { stavke, ...rest } = input;
    const created = await prisma.nalogMontazu.create({
      data: {
        pravnoLiceId: rn.pravnoLiceId,
        broj,
        ...rest,
        stavke: { create: stavke.map((s, i) => ({ ...s, redniBr: s.redniBr ?? i + 1, brojPanoa: s.brojPanoa ?? null })) },
      },
      include: { stavke: true },
    });
    await audit({ ctx: ctx.session, entitet: "NalogMontazu", entitetId: created.id, akcija: "CREATE", diff: { broj, tip: input.tip } });
    return created;
  }),

  update: withPermission("campaigns", "UPDATE").input(
    z.object({
      id: z.string().cuid(),
      ekipa: z.string().optional(),
      montazerId: z.string().cuid().optional().nullable(),
      prevoznikNaziv: z.string().optional(),
      masinaId: z.string().cuid().optional().nullable(),
      datumMontaze: z.coerce.date().optional().nullable(),
      vremeMontaze: z.string().optional(),
      napomena: z.string().optional(),
    }),
  ).mutation(async ({ ctx, input }) => {
    const n = await prisma.nalogMontazu.findUnique({ where: { id: input.id } });
    if (!n) throw new AppError("NOT_FOUND", "Nalog ne postoji");
    ensureTenant(ctx.session!, n.pravnoLiceId);
    const { id, ...rest } = input;
    return prisma.nalogMontazu.update({ where: { id }, data: rest });
  }),

  addStavka: withPermission("campaigns", "UPDATE").input(
    stavkaInput.extend({ nalogId: z.string().cuid() }),
  ).mutation(async ({ ctx, input }) => {
    const n = await prisma.nalogMontazu.findUnique({ where: { id: input.nalogId } });
    if (!n) throw new AppError("NOT_FOUND", "Nalog ne postoji");
    ensureTenant(ctx.session!, n.pravnoLiceId);
    const { nalogId, ...rest } = input;
    const cnt = await prisma.nalogMontazuStavka.count({ where: { nalogId } });
    return prisma.nalogMontazuStavka.create({
      data: { nalogId, redniBr: rest.redniBr ?? cnt + 1, ...rest, brojPanoa: rest.brojPanoa ?? null },
    });
  }),

  setStavkaStatus: withPermission("campaigns", "UPDATE").input(
    z.object({
      stavkaId: z.string().cuid(),
      status: z.nativeEnum(NalogStavkaStatus),
      problemTip: z.string().optional(),
      napomena: z.string().optional(),
    }),
  ).mutation(async ({ ctx, input }) => {
    const s = await prisma.nalogMontazuStavka.findUnique({ where: { id: input.stavkaId }, include: { nalog: true } });
    if (!s) throw new AppError("NOT_FOUND", "Stavka ne postoji");
    ensureTenant(ctx.session!, s.nalog.pravnoLiceId);
    return prisma.nalogMontazuStavka.update({
      where: { id: input.stavkaId },
      data: {
        status: input.status,
        problemTip: input.problemTip,
        napomena: input.napomena,
        ...(input.status === "POSTAVLJENO" ? { postavljenoAt: new Date() } : {}),
      },
    });
  }),

  removeStavka: withPermission("campaigns", "UPDATE").input(
    z.object({ stavkaId: z.string().cuid() }),
  ).mutation(async ({ ctx, input }) => {
    const s = await prisma.nalogMontazuStavka.findUnique({ where: { id: input.stavkaId }, include: { nalog: true } });
    if (!s) throw new AppError("NOT_FOUND", "Stavka ne postoji");
    ensureTenant(ctx.session!, s.nalog.pravnoLiceId);
    await prisma.nalogMontazuStavka.delete({ where: { id: input.stavkaId } });
    return { ok: true };
  }),

  setStatus: withPermission("campaigns", "UPDATE").input(
    z.object({ id: z.string().cuid(), status: z.nativeEnum(NalogStavkaStatus) }),
  ).mutation(async ({ ctx, input }) => {
    const n = await prisma.nalogMontazu.findUnique({ where: { id: input.id } });
    if (!n) throw new AppError("NOT_FOUND", "Nalog ne postoji");
    ensureTenant(ctx.session!, n.pravnoLiceId);
    return prisma.nalogMontazu.update({ where: { id: input.id }, data: { status: input.status } });
  }),

  remove: withPermission("campaigns", "DELETE").input(
    z.object({ id: z.string().cuid() }),
  ).mutation(async ({ ctx, input }) => {
    const n = await prisma.nalogMontazu.findUnique({ where: { id: input.id } });
    if (!n) throw new AppError("NOT_FOUND", "Nalog ne postoji");
    ensureTenant(ctx.session!, n.pravnoLiceId);
    await prisma.nalogMontazu.delete({ where: { id: input.id } });
    return { ok: true };
  }),
});

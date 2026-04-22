import { z } from "zod";
import { router, withPermission } from "../trpc";
import { prisma } from "@/lib/prisma";
import { tenantWhere, ensureTenant } from "../tenant";
import { audit } from "../audit";
import { AppError } from "../errors";
import { DokumentTip, DokumentStatus } from "@prisma/client";
import { generateInvoiceNumber } from "@/server/services/numeration";

const stavkaSchema = z.object({
  opis: z.string(),
  kolicina: z.string().default("1"),
  jedinicnaCena: z.string(),
  popust: z.string().default("0"),
  kampanjaStavkaId: z.string().cuid().optional(),
});

export const invoicesRouter = router({
  list: withPermission("invoices", "READ").input(
    z.object({
      status: z.nativeEnum(DokumentStatus).optional(),
      tip: z.nativeEnum(DokumentTip).optional(),
    }).optional(),
  ).query(async ({ ctx, input }) => {
    return prisma.dokument.findMany({
      where: { ...tenantWhere(ctx.session!), ...(input?.status ? { status: input.status } : {}), ...(input?.tip ? { tip: input.tip } : {}) },
      include: { partner: true, stavke: true },
      orderBy: { datum: "desc" },
      take: 200,
    });
  }),

  byId: withPermission("invoices", "READ").input(z.object({ id: z.string().cuid() })).query(async ({ ctx, input }) => {
    const d = await prisma.dokument.findUnique({
      where: { id: input.id },
      include: { partner: true, stavke: true, kampanja: true, pravnoLice: true },
    });
    if (!d) return null;
    ensureTenant(ctx.session!, d.pravnoLiceId);
    return d;
  }),

  markPaid: withPermission("invoices", "UPDATE").input(z.object({ id: z.string().cuid(), status: z.nativeEnum(DokumentStatus) })).mutation(async ({ input, ctx }) => {
    const d = await prisma.dokument.findUnique({ where: { id: input.id } });
    if (!d) throw new AppError("NOT_FOUND", "Dokument ne postoji");
    ensureTenant(ctx.session!, d.pravnoLiceId);
    const updated = await prisma.dokument.update({ where: { id: input.id }, data: { status: input.status } });
    await audit({ ctx: ctx.session, entitet: "Dokument", entitetId: input.id, akcija: "UPDATE", diff: { status: input.status } });
    return updated;
  }),

  create: withPermission("invoices", "CREATE").input(
    z.object({
      tip: z.nativeEnum(DokumentTip),
      partnerId: z.string().cuid(),
      kampanjaId: z.string().cuid().optional(),
      datum: z.coerce.date(),
      rokPlacanja: z.coerce.date().optional(),
      valuta: z.string().length(3),
      stopaPdv: z.number().min(0).max(30).default(21),
      stavke: z.array(stavkaSchema).min(1),
      napomene: z.string().optional(),
    }),
  ).mutation(async ({ ctx, input }) => {
    const partner = await prisma.partner.findUnique({ where: { id: input.partnerId } });
    if (!partner) throw new AppError("NOT_FOUND", "Partner ne postoji");
    ensureTenant(ctx.session!, partner.pravnoLiceId);

    const broj = await generateInvoiceNumber(ctx.session!.tenantId, input.tip, input.datum.getFullYear());

    const stavkeData = input.stavke.map((s) => {
      const brutto = Number(s.kolicina) * Number(s.jedinicnaCena);
      const popust = Number(s.popust);
      const iznos = brutto - (brutto * popust) / 100;
      return { ...s, iznos: iznos.toFixed(2) };
    });
    const podzbir = stavkeData.reduce((acc, s) => acc + Number(s.iznos), 0);
    const pdv = (podzbir * input.stopaPdv) / 100;
    const ukupno = podzbir + pdv;

    const created = await prisma.dokument.create({
      data: {
        pravnoLiceId: ctx.session!.tenantId,
        tip: input.tip,
        broj,
        datum: input.datum,
        rokPlacanja: input.rokPlacanja,
        partnerId: input.partnerId,
        kampanjaId: input.kampanjaId,
        podzbir: podzbir.toFixed(2),
        pdv: pdv.toFixed(2),
        ukupno: ukupno.toFixed(2),
        valuta: input.valuta,
        napomene: input.napomene,
        stavke: { create: stavkeData },
      },
      include: { stavke: true },
    });
    await audit({ ctx: ctx.session, entitet: "Dokument", entitetId: created.id, akcija: "INVOICE_GENERATE", diff: { tip: input.tip, broj } });
    return created;
  }),

  storno: withPermission("invoices", "APPROVE").input(z.object({ dokumentId: z.string().cuid(), razlog: z.string().min(5) })).mutation(async ({ ctx, input }) => {
    const d = await prisma.dokument.findUnique({ where: { id: input.dokumentId }, include: { stavke: true } });
    if (!d) throw new AppError("NOT_FOUND", "Dokument ne postoji");
    ensureTenant(ctx.session!, d.pravnoLiceId);
    if (d.status === "STORNIRAN") throw new AppError("CONFLICT", "Već stornirano");

    const broj = await generateInvoiceNumber(d.pravnoLiceId, DokumentTip.STORNO, new Date().getFullYear());

    const storno = await prisma.dokument.create({
      data: {
        pravnoLiceId: d.pravnoLiceId,
        tip: DokumentTip.STORNO,
        broj,
        datum: new Date(),
        partnerId: d.partnerId,
        kampanjaId: d.kampanjaId,
        podzbir: `-${d.podzbir}`,
        pdv: `-${d.pdv}`,
        ukupno: `-${d.ukupno}`,
        valuta: d.valuta,
        napomene: `Storno ${d.broj}: ${input.razlog}`,
        stornoOdId: d.id,
        stavke: {
          create: d.stavke.map((s) => ({
            opis: `STORNO: ${s.opis}`,
            kolicina: s.kolicina.toString(),
            jedinicnaCena: s.jedinicnaCena.toString(),
            iznos: `-${s.iznos}`,
          })),
        },
      },
    });
    await prisma.dokument.update({ where: { id: d.id }, data: { status: "STORNIRAN" } });
    await audit({ ctx: ctx.session, entitet: "Dokument", entitetId: storno.id, akcija: "INVOICE_GENERATE", diff: { storno: d.id, razlog: input.razlog } });
    return storno;
  }),
});

import { z } from "zod";
import { router, withPermission } from "../trpc";
import { prisma } from "@/lib/prisma";
import { tenantWhere, ensureTenant } from "../tenant";
import { audit } from "../audit";
import { AppError } from "../errors";
import { KampanjaStatus, RezervacijaStatus, PozicijaTip } from "@prisma/client";

export const campaignsRouter = router({
  create: withPermission("campaigns", "CREATE").input(
    z.object({
      naziv: z.string().min(2),
      partnerId: z.string().cuid(),
      odDatum: z.coerce.date(),
      doDatum: z.coerce.date(),
      valuta: z.string().length(3),
      opportunityId: z.string().cuid().optional(),
      ponudaId: z.string().cuid().optional(),
      napomene: z.string().optional(),
      stavke: z.array(z.object({
        // Podržava ili pozicijaId direktno, ili voziloId + pozicijaTip
        // (server kreira poziciju ako ne postoji)
        pozicijaId: z.string().cuid().optional(),
        voziloId: z.string().cuid().optional(),
        pozicijaTip: z.nativeEnum(PozicijaTip).optional(),
        odDatum: z.coerce.date(),
        doDatum: z.coerce.date(),
        cena: z.string(),
      })).optional(),
    }),
  ).mutation(async ({ ctx, input }) => {
    const partner = await prisma.partner.findUnique({ where: { id: input.partnerId } });
    if (!partner) throw new AppError("NOT_FOUND", "Partner ne postoji");
    ensureTenant(ctx.session!, partner.pravnoLiceId);

    const created = await prisma.kampanja.create({
      data: {
        pravnoLiceId: ctx.session!.tenantId,
        naziv: input.naziv,
        partnerId: input.partnerId,
        odDatum: input.odDatum,
        doDatum: input.doDatum,
        valuta: input.valuta,
        opportunityId: input.opportunityId,
        ponudaId: input.ponudaId,
        napomene: input.napomene,
        status: KampanjaStatus.POTVRDENA,
      },
    });

    if (input.stavke && input.stavke.length > 0) {
      for (const s of input.stavke) {
        // Razreši pozicijaId: ili je dat, ili pronađi/kreiraj za vozilo+tip
        let pozicijaId = s.pozicijaId;
        if (!pozicijaId && s.voziloId && s.pozicijaTip) {
          let poz = await prisma.pozicija.findFirst({
            where: { voziloId: s.voziloId, tip: s.pozicijaTip },
          });
          if (!poz) {
            poz = await prisma.pozicija.create({
              data: {
                voziloId: s.voziloId,
                tip: s.pozicijaTip,
                dimenzije: s.pozicijaTip === "UNUTRA" ? "unutrašnji branding" : "celo vozilo",
                minPeriodDana: 7,
                cenaPoPeriodu: 0,
                valuta: input.valuta,
              },
            });
          }
          pozicijaId = poz.id;
        }
        if (!pozicijaId) continue;

        // Konflikt check
        const conflict = await prisma.rezervacija.findFirst({
          where: {
            pozicijaId,
            status: { in: [RezervacijaStatus.CONFIRMED, RezervacijaStatus.RUNNING, RezervacijaStatus.HOLD] },
            odDatum: { lte: s.doDatum },
            doDatum: { gte: s.odDatum },
          },
        });
        if (conflict) continue;
        await prisma.$transaction([
          prisma.kampanjaStavka.create({
            data: {
              kampanjaId: created.id,
              pozicijaId,
              odDatum: s.odDatum,
              doDatum: s.doDatum,
              cena: s.cena,
              valuta: input.valuta,
            },
          }),
          prisma.rezervacija.create({
            data: {
              pozicijaId,
              kampanjaId: created.id,
              status: RezervacijaStatus.CONFIRMED,
              odDatum: s.odDatum,
              doDatum: s.doDatum,
            },
          }),
        ]);
      }
    }
    await audit({ ctx: ctx.session, entitet: "Kampanja", entitetId: created.id, akcija: "CREATE", diff: { naziv: input.naziv } });
    return created;
  }),

  list: withPermission("campaigns", "READ").input(
    z.object({ status: z.nativeEnum(KampanjaStatus).optional() }).optional(),
  ).query(async ({ ctx, input }) => {
    return prisma.kampanja.findMany({
      where: { ...tenantWhere(ctx.session!), deletedAt: null, ...(input?.status ? { status: input.status } : {}) },
      include: { partner: true, opportunity: true },
      orderBy: { odDatum: "desc" },
      take: 200,
    });
  }),

  byId: withPermission("campaigns", "READ").input(z.object({ id: z.string().cuid() })).query(async ({ ctx, input }) => {
    const k = await prisma.kampanja.findUnique({
      where: { id: input.id },
      include: {
        partner: true,
        stavke: { include: { pozicija: { include: { vozilo: true } } } },
        dokumenti: true,
      },
    });
    if (!k) return null;
    ensureTenant(ctx.session!, k.pravnoLiceId);
    return k;
  }),

  addItem: withPermission("campaigns", "UPDATE").input(
    z.object({
      kampanjaId: z.string().cuid(),
      pozicijaId: z.string().cuid(),
      odDatum: z.coerce.date(),
      doDatum: z.coerce.date(),
      cena: z.string(),
      valuta: z.string().length(3),
    }),
  ).mutation(async ({ input, ctx }) => {
    const k = await prisma.kampanja.findUnique({ where: { id: input.kampanjaId } });
    if (!k) throw new AppError("NOT_FOUND", "Kampanja ne postoji");
    ensureTenant(ctx.session!, k.pravnoLiceId);
    const conflict = await prisma.rezervacija.findFirst({
      where: {
        pozicijaId: input.pozicijaId,
        status: { in: [RezervacijaStatus.CONFIRMED, RezervacijaStatus.RUNNING, RezervacijaStatus.HOLD] },
        odDatum: { lte: input.doDatum },
        doDatum: { gte: input.odDatum },
        NOT: { kampanjaId: input.kampanjaId },
      },
    });
    if (conflict) throw new AppError("CONFLICT", "Pozicija je već rezervisana u tom periodu");
    const [stavka] = await prisma.$transaction([
      prisma.kampanjaStavka.create({ data: input }),
      prisma.rezervacija.create({
        data: {
          pozicijaId: input.pozicijaId,
          kampanjaId: input.kampanjaId,
          status: RezervacijaStatus.CONFIRMED,
          odDatum: input.odDatum,
          doDatum: input.doDatum,
        },
      }),
    ]);
    await audit({ ctx: ctx.session, entitet: "Kampanja", entitetId: input.kampanjaId, akcija: "UPDATE", diff: { added: input.pozicijaId } });
    return stavka;
  }),

  availablePositions: withPermission("campaigns", "READ").input(
    z.object({ kampanjaId: z.string().cuid() }),
  ).query(async ({ ctx, input }) => {
    const k = await prisma.kampanja.findUnique({ where: { id: input.kampanjaId } });
    if (!k) throw new AppError("NOT_FOUND", "Kampanja ne postoji");
    ensureTenant(ctx.session!, k.pravnoLiceId);
    return prisma.pozicija.findMany({
      where: { vozilo: { pravnoLiceId: k.pravnoLiceId, deletedAt: null } },
      include: {
        vozilo: true,
        rezervacije: {
          where: {
            status: { in: [RezervacijaStatus.CONFIRMED, RezervacijaStatus.RUNNING, RezervacijaStatus.HOLD] },
            odDatum: { lte: k.doDatum },
            doDatum: { gte: k.odDatum },
          },
        },
      },
      orderBy: { vozilo: { registracija: "asc" } },
    });
  }),

  removeItem: withPermission("campaigns", "UPDATE").input(z.object({ stavkaId: z.string().cuid() })).mutation(async ({ input, ctx }) => {
    const stavka = await prisma.kampanjaStavka.findUnique({ where: { id: input.stavkaId }, include: { kampanja: true } });
    if (!stavka) throw new AppError("NOT_FOUND", "Stavka ne postoji");
    ensureTenant(ctx.session!, stavka.kampanja.pravnoLiceId);
    await prisma.$transaction([
      prisma.rezervacija.updateMany({
        where: { kampanjaId: stavka.kampanjaId, pozicijaId: stavka.pozicijaId },
        data: { status: RezervacijaStatus.RELEASED },
      }),
      prisma.kampanjaStavka.delete({ where: { id: input.stavkaId } }),
    ]);
    await audit({ ctx: ctx.session, entitet: "Kampanja", entitetId: stavka.kampanjaId, akcija: "UPDATE", diff: { removed: stavka.pozicijaId } });
    return { ok: true };
  }),

  advanceStatus: withPermission("campaigns", "UPDATE").input(z.object({ id: z.string().cuid(), status: z.nativeEnum(KampanjaStatus) })).mutation(async ({ input, ctx }) => {
    const k = await prisma.kampanja.findUnique({ where: { id: input.id } });
    if (!k) throw new AppError("NOT_FOUND", "Kampanja ne postoji");
    ensureTenant(ctx.session!, k.pravnoLiceId);
    const updated = await prisma.kampanja.update({ where: { id: input.id }, data: { status: input.status } });
    await audit({ ctx: ctx.session, entitet: "Kampanja", entitetId: input.id, akcija: "UPDATE", diff: { status: input.status } });
    return updated;
  }),

  cancel: withPermission("campaigns", "UPDATE").input(z.object({ id: z.string().cuid(), razlog: z.string().min(5) })).mutation(async ({ input, ctx }) => {
    const k = await prisma.kampanja.findUnique({ where: { id: input.id } });
    if (!k) throw new AppError("NOT_FOUND", "Kampanja ne postoji");
    ensureTenant(ctx.session!, k.pravnoLiceId);
    if (k.status === KampanjaStatus.OTKAZANA) throw new AppError("CONFLICT", "Već otkazano");
    await prisma.$transaction([
      prisma.kampanja.update({ where: { id: input.id }, data: { status: KampanjaStatus.OTKAZANA, napomene: `Otkazano: ${input.razlog}` } }),
      prisma.rezervacija.updateMany({
        where: { kampanjaId: input.id, status: { in: [RezervacijaStatus.CONFIRMED, RezervacijaStatus.RUNNING] } },
        data: { status: RezervacijaStatus.CANCELLED },
      }),
    ]);
    await audit({ ctx: ctx.session, entitet: "Kampanja", entitetId: input.id, akcija: "UPDATE", diff: { cancelled: true, razlog: input.razlog } });
    return { ok: true };
  }),
});

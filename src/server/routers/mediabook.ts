import { z } from "zod";
import { router, withPermission } from "../trpc";
import { prisma } from "@/lib/prisma";
import { tenantWhere, ensureTenant } from "../tenant";
import { audit } from "../audit";
import { AppError } from "../errors";
import { RezervacijaStatus } from "@prisma/client";

const HOLD_DAYS_DEFAULT = 14;

export const mediabookRouter = router({
  grid: withPermission("mediabook", "READ").input(
    z.object({
      from: z.coerce.date(),
      to: z.coerce.date(),
      grad: z.string().optional(),
    }),
  ).query(async ({ ctx, input }) => {
    const vozila = await prisma.vozilo.findMany({
      where: {
        ...tenantWhere(ctx.session!),
        deletedAt: null,
        ...(input.grad ? { grad: input.grad } : {}),
      },
      include: {
        pozicije: {
          include: {
            rezervacije: {
              where: {
                OR: [
                  { odDatum: { lte: input.to }, doDatum: { gte: input.from } },
                ],
              },
            },
          },
        },
      },
    });
    return vozila;
  }),

  setHold: withPermission("mediabook", "APPROVE").input(
    z.object({
      opportunityId: z.string().cuid(),
      pozicijaId: z.string().cuid(),
      odDatum: z.coerce.date(),
      doDatum: z.coerce.date(),
    }),
  ).mutation(async ({ ctx, input }) => {
    const opp = await prisma.opportunity.findUnique({ where: { id: input.opportunityId } });
    if (!opp) throw new AppError("NOT_FOUND", "Opportunity ne postoji");
    ensureTenant(ctx.session!, opp.pravnoLiceId);

    // konflikt-check (PZ 4.9)
    const conflict = await prisma.rezervacija.findFirst({
      where: {
        pozicijaId: input.pozicijaId,
        status: { in: [RezervacijaStatus.HOLD, RezervacijaStatus.CONFIRMED, RezervacijaStatus.RUNNING] },
        odDatum: { lte: input.doDatum },
        doDatum: { gte: input.odDatum },
        ...(opp.id ? { NOT: { opportunityId: opp.id } } : {}),
      },
    });
    if (conflict) throw new AppError("CONFLICT", "Pozicija je već rezervisana u tom periodu");

    const holdIstice = new Date(Date.now() + HOLD_DAYS_DEFAULT * 24 * 60 * 60 * 1000);
    const rez = await prisma.rezervacija.create({
      data: {
        pozicijaId: input.pozicijaId,
        opportunityId: input.opportunityId,
        status: RezervacijaStatus.HOLD,
        odDatum: input.odDatum,
        doDatum: input.doDatum,
        holdIstice,
      },
    });
    await audit({ ctx: ctx.session, entitet: "Rezervacija", entitetId: rez.id, akcija: "HOLD_CREATE", diff: input });
    return rez;
  }),

  releaseHold: withPermission("mediabook", "APPROVE").input(z.object({ rezervacijaId: z.string().cuid() })).mutation(async ({ ctx, input }) => {
    const rez = await prisma.rezervacija.update({
      where: { id: input.rezervacijaId },
      data: { status: RezervacijaStatus.RELEASED },
    });
    await audit({ ctx: ctx.session, entitet: "Rezervacija", entitetId: rez.id, akcija: "HOLD_RELEASE" });
    return rez;
  }),
});

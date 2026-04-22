import { z } from "zod";
import { router, withPermission } from "../trpc";
import { prisma } from "@/lib/prisma";
import { tenantWhere, ensureTenant } from "../tenant";
import { audit } from "../audit";
import { AppError } from "../errors";
import { StageKod, LostReasonKod, OppIzvor, RezervacijaStatus } from "@prisma/client";
import { notify } from "../services/notify";

const oppInput = z.object({
  naziv: z.string().min(2).max(200),
  partnerId: z.string().cuid(),
  kontaktId: z.string().cuid().optional(),
  vlasnikId: z.string().cuid(),
  stageKod: z.nativeEnum(StageKod).default(StageKod.NEW),
  probability: z.number().min(0).max(100).optional(),
  izvor: z.nativeEnum(OppIzvor).default(OppIzvor.OUTBOUND),
  valuta: z.string().length(3),
  expValue: z.string().regex(/^\d+(\.\d{1,2})?$/),
  expCloseDate: z.coerce.date(),
  tags: z.array(z.string()).default([]),
  opis: z.string().optional(),
});

export const opportunitiesRouter = router({
  list: withPermission("opportunities", "READ").input(
    z.object({
      stageKod: z.nativeEnum(StageKod).optional(),
      vlasnikId: z.string().cuid().optional(),
      q: z.string().optional(),
    }).optional(),
  ).query(async ({ ctx, input }) => {
    return prisma.opportunity.findMany({
      where: {
        ...tenantWhere(ctx.session!),
        deletedAt: null,
        ...(input?.vlasnikId ? { vlasnikId: input.vlasnikId } : {}),
        ...(input?.q ? { naziv: { contains: input.q, mode: "insensitive" } } : {}),
        ...(input?.stageKod ? { stage: { kod: input.stageKod } } : {}),
      },
      include: { partner: true, vlasnik: true, stage: true, lostReason: true },
      orderBy: { expCloseDate: "asc" },
      take: 200,
    });
  }),

  byId: withPermission("opportunities", "READ").input(z.object({ id: z.string().cuid() })).query(async ({ ctx, input }) => {
    const o = await prisma.opportunity.findUnique({
      where: { id: input.id },
      include: {
        partner: true,
        vlasnik: true,
        stage: true,
        lostReason: true,
        aktivnosti: true,
        kampanja: true,
        rezervacije: { include: { pozicija: { include: { vozilo: true } } } },
      },
    });
    if (!o) return null;
    ensureTenant(ctx.session!, o.pravnoLiceId);
    return o;
  }),

  create: withPermission("opportunities", "CREATE").input(oppInput).mutation(async ({ ctx, input }) => {
    const stage = await prisma.stage.findUnique({ where: { kod: input.stageKod } });
    if (!stage) throw new AppError("VALIDATION", `Nepoznat stage: ${input.stageKod}`);
    const partner = await prisma.partner.findUnique({ where: { id: input.partnerId } });
    if (!partner) throw new AppError("NOT_FOUND", "Partner ne postoji");
    ensureTenant(ctx.session!, partner.pravnoLiceId);

    const created = await prisma.opportunity.create({
      data: {
        pravnoLiceId: ctx.session!.tenantId,
        naziv: input.naziv,
        partnerId: input.partnerId,
        kontaktId: input.kontaktId,
        vlasnikId: input.vlasnikId,
        stageId: stage.id,
        probability: input.probability ?? stage.defaultProbability,
        izvor: input.izvor,
        valuta: input.valuta,
        expValue: input.expValue,
        expCloseDate: input.expCloseDate,
        tags: input.tags,
        opis: input.opis,
      },
    });
    await audit({ ctx: ctx.session, entitet: "Opportunity", entitetId: created.id, akcija: "CREATE", diff: input });
    if (created.vlasnikId !== ctx.session!.korisnikId) {
      await notify({
        pravnoLiceId: created.pravnoLiceId,
        korisnikId: created.vlasnikId,
        tip: "OPP_DODELJEN",
        poruka: `Dodeljena ti je nova prilika "${created.naziv}"`,
        linkUrl: `/opportunities/${created.id}`,
      });
    }
    return created;
  }),

  setStage: withPermission("opportunities", "UPDATE")
    .input(
      z.object({
        id: z.string().cuid(),
        stageKod: z.nativeEnum(StageKod),
        lostReasonKod: z.nativeEnum(LostReasonKod).optional(),
        lostReasonText: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const opp = await prisma.opportunity.findUnique({ where: { id: input.id } });
      if (!opp) throw new AppError("NOT_FOUND", "Opportunity ne postoji");
      ensureTenant(ctx.session!, opp.pravnoLiceId);

      const newStage = await prisma.stage.findUnique({ where: { kod: input.stageKod } });
      if (!newStage) throw new AppError("VALIDATION", "Nepoznat stage");

      if (input.stageKod === "LOST" && !input.lostReasonKod) {
        throw new AppError("VALIDATION", "Lost reason je obavezan pri prelasku u LOST");
      }
      if (input.lostReasonKod === "OSTALO" && !input.lostReasonText) {
        throw new AppError("VALIDATION", "Slobodan tekst je obavezan kada je razlog OSTALO");
      }

      const lostReason = input.lostReasonKod ? await prisma.lostReason.findUnique({ where: { kod: input.lostReasonKod } }) : null;

      const updated = await prisma.opportunity.update({
        where: { id: input.id },
        data: {
          stageId: newStage.id,
          probability: newStage.defaultProbability,
          lostReasonId: lostReason?.id ?? null,
          lostReasonText: input.lostReasonText ?? null,
          closedAt: ["WON", "LOST"].includes(input.stageKod) ? new Date() : null,
        },
      });

      await audit({
        ctx: ctx.session,
        entitet: "Opportunity",
        entitetId: input.id,
        akcija: "STAGE_CHANGE",
        diff: { from: opp.stageId, to: newStage.id, lostReason: input.lostReasonKod },
      });

      // Side-effect: NEGOTIATION → hold na postojećim predlogom (ako postoji)
      // Kod Won → konverzija u rezervacije
      if (input.stageKod === "WON") {
        await prisma.rezervacija.updateMany({
          where: { opportunityId: input.id, status: RezervacijaStatus.HOLD },
          data: { status: RezervacijaStatus.CONFIRMED, holdIstice: null },
        });
      }
      if (input.stageKod === "LOST") {
        await prisma.rezervacija.updateMany({
          where: { opportunityId: input.id, status: RezervacijaStatus.HOLD },
          data: { status: RezervacijaStatus.RELEASED },
        });
      }

      return updated;
    }),

  convertToCampaign: withPermission("campaigns", "CREATE")
    .input(z.object({ opportunityId: z.string().cuid(), odDatum: z.coerce.date(), doDatum: z.coerce.date() }))
    .mutation(async ({ ctx, input }) => {
      const opp = await prisma.opportunity.findUnique({ where: { id: input.opportunityId }, include: { stage: true } });
      if (!opp) throw new AppError("NOT_FOUND", "Opportunity ne postoji");
      ensureTenant(ctx.session!, opp.pravnoLiceId);
      if (opp.stage.kod !== "WON") throw new AppError("CONFLICT", "Konverzija je dozvoljena samo iz Won");
      const existing = await prisma.kampanja.findUnique({ where: { opportunityId: opp.id } });
      if (existing) return existing;
      const k = await prisma.kampanja.create({
        data: {
          pravnoLiceId: opp.pravnoLiceId,
          opportunityId: opp.id,
          partnerId: opp.partnerId,
          naziv: opp.naziv,
          odDatum: input.odDatum,
          doDatum: input.doDatum,
          valuta: opp.valuta,
        },
      });
      await audit({ ctx: ctx.session, entitet: "Kampanja", entitetId: k.id, akcija: "CREATE", diff: { fromOpportunity: opp.id } });
      await notify({
        pravnoLiceId: opp.pravnoLiceId,
        korisnikId: opp.vlasnikId,
        tip: "KAMPANJA_POTVRDENA",
        poruka: `Kampanja "${k.naziv}" je potvrđena`,
        linkUrl: `/campaigns/${k.id}`,
      });
      return k;
    }),
});

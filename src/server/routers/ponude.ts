import { z } from "zod";
import { router, withPermission } from "../trpc";
import { prisma } from "@/lib/prisma";
import { tenantWhere, ensureTenant } from "../tenant";
import { audit } from "../audit";
import { AppError } from "../errors";
import { notifyRoles } from "../services/notify";
import { createRadniNalogForOpportunity, createPlanFakturisanjaForWon } from "../services/work-order";
import { PonudaStatus } from "@prisma/client";

const stavkaSchema = z.object({
  rb: z.number().int().positive(),
  opis: z.string().min(1),
  grad: z.string().optional(),
  brojVozila: z.number().int().min(1).default(1),
  cena: z.string(),
  popustPct: z.string().default("0"),
  tipBrendinga: z.string().optional(),
  skicaUrl: z.string().url().optional().or(z.literal("")),
  voziloId: z.string().cuid().optional(),
});

function rndBroj(kod: string) {
  return `P-${kod}-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
}

export const ponudeRouter = router({
  list: withPermission("opportunities", "READ").input(
    z.object({ status: z.nativeEnum(PonudaStatus).optional(), partnerId: z.string().cuid().optional() }).optional(),
  ).query(async ({ ctx, input }) => {
    return prisma.ponuda.findMany({
      where: {
        ...tenantWhere(ctx.session!),
        ...(input?.status ? { status: input.status } : {}),
        ...(input?.partnerId ? { partnerId: input.partnerId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }),

  byId: withPermission("opportunities", "READ").input(z.object({ id: z.string().cuid() })).query(async ({ ctx, input }) => {
    const p = await prisma.ponuda.findUnique({
      where: { id: input.id },
      include: { stavke: { orderBy: { rb: "asc" } } },
    });
    if (!p) return null;
    ensureTenant(ctx.session!, p.pravnoLiceId);
    const [partner, vlasnik, opp] = await Promise.all([
      prisma.partner.findUnique({ where: { id: p.partnerId } }),
      prisma.korisnik.findUnique({ where: { id: p.vlasnikId } }),
      p.opportunityId ? prisma.opportunity.findUnique({ where: { id: p.opportunityId } }) : null,
    ]);
    return { ...p, partner, vlasnik, opportunity: opp };
  }),

  create: withPermission("opportunities", "CREATE").input(
    z.object({
      partnerId: z.string().cuid(),
      opportunityId: z.string().cuid().optional(),
      vaziDo: z.coerce.date(),
      valuta: z.string().length(3),
      stopaPdv: z.string().default("20"),
      napomena: z.string().optional(),
      stavke: z.array(stavkaSchema).min(1),
    }),
  ).mutation(async ({ ctx, input }) => {
    const partner = await prisma.partner.findUnique({ where: { id: input.partnerId } });
    if (!partner) throw new AppError("NOT_FOUND", "Klijent ne postoji");
    ensureTenant(ctx.session!, partner.pravnoLiceId);

    const pl = await prisma.pravnoLice.findUnique({ where: { id: ctx.session!.tenantId } });

    const stavkeData = input.stavke.map((s) => {
      const brutto = Number(s.cena) * s.brojVozila;
      const iznos = brutto * (1 - Number(s.popustPct) / 100);
      const { tipBrendinga, skicaUrl, ...rest } = s;
      return {
        ...rest,
        tipBrendinga: tipBrendinga ? (tipBrendinga as any) : undefined,
        skicaUrl: skicaUrl || undefined,
        iznos: iznos.toFixed(2),
        valuta: input.valuta,
      };
    });
    const ukupno = stavkeData.reduce((a, s) => a + Number(s.iznos), 0);

    const created = await prisma.ponuda.create({
      data: {
        pravnoLiceId: ctx.session!.tenantId,
        broj: rndBroj(pl?.kod ?? "IMG"),
        opportunityId: input.opportunityId,
        partnerId: input.partnerId,
        vlasnikId: ctx.session!.korisnikId,
        vaziDo: input.vaziDo,
        valuta: input.valuta,
        stopaPdv: input.stopaPdv,
        napomena: input.napomena,
        ukupno: String(ukupno),
        stavke: { create: stavkeData },
      },
      include: { stavke: true },
    });
    await audit({ ctx: ctx.session, entitet: "Ponuda", entitetId: created.id, akcija: "CREATE" });
    return created;
  }),

  setStatus: withPermission("opportunities", "UPDATE").input(
    z.object({ id: z.string().cuid(), status: z.nativeEnum(PonudaStatus) }),
  ).mutation(async ({ ctx, input }) => {
    const existing = await prisma.ponuda.findUnique({ where: { id: input.id } });
    if (!existing) throw new AppError("NOT_FOUND", "Ponuda ne postoji");
    ensureTenant(ctx.session!, existing.pravnoLiceId);

    const now = new Date();
    const updated = await prisma.ponuda.update({
      where: { id: input.id },
      data: {
        status: input.status,
        ...(input.status === "POSLATA" ? { poslataAt: now } : {}),
        ...(input.status === "PRIHVACENA" ? { prihvacenaAt: now } : {}),
        ...(input.status === "ODBIJENA" ? { odbijenaAt: now } : {}),
      },
    });
    await audit({ ctx: ctx.session, entitet: "Ponuda", entitetId: input.id, akcija: "UPDATE", diff: { status: input.status } });

    // Automatizacija: prihvaćena ponuda → Radni nalog + Plan fakturisanja
    if (input.status === "PRIHVACENA" && existing.opportunityId) {
      const opp = await prisma.opportunity.findUnique({ where: { id: existing.opportunityId } });
      if (opp) {
        try {
          await createRadniNalogForOpportunity(opp as any);
          await createPlanFakturisanjaForWon({
            opp: opp as any,
            kampanjaOd: opp.expCloseDate,
            kampanjaDo: new Date(opp.expCloseDate.getTime() + 30 * 86400000),
          });
          await notifyRoles({
            pravnoLiceId: existing.pravnoLiceId,
            rolaKodovi: ["SALES_MANAGER", "COUNTRY_MANAGER", "ADMIN"],
            tip: "PONUDA_PRIHVACENA",
            poruka: `Ponuda ${existing.broj} prihvaćena — prosleđeno logistici i finansijama.`,
            linkUrl: `/prodaja/ponude/${existing.id}`,
          });
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error("[ponuda.prihvacena] automation error", e);
        }
      }
    }

    return updated;
  }),
});

import { z } from "zod";
import { router, withPermission, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { tenantWhere, ensureTenant } from "../tenant";
import { audit } from "../audit";
import { AppError } from "../errors";
import { hasRole } from "../rbac";

/**
 * Planovi rada — godišnji (target per kategorija+mesec) i dnevni (slobodan tekst).
 * PZ: godišnji plan prodavci prave po kategorijama delatnosti i po mesecima
 * raspoređuju usvojeni target, a dnevni planovi su opisni.
 */
export const planoviRouter = router({
  // ===== Godišnji =====
  godisnjiList: protectedProcedure.input(z.object({ godina: z.number().int() }).optional()).query(async ({ ctx, input }) => {
    const godina = input?.godina ?? new Date().getFullYear();
    const isManager = hasRole(ctx.session!, "SALES_MANAGER", "COUNTRY_MANAGER", "ADMIN");
    return prisma.planRadaGodisnji.findMany({
      where: {
        ...tenantWhere(ctx.session!),
        godina,
        ...(isManager ? {} : { korisnikId: ctx.session!.korisnikId }),
      },
      include: { stavke: { include: { kategorija: true } } },
      orderBy: { korisnikId: "asc" },
    });
  }),

  godisnjiMine: protectedProcedure.input(z.object({ godina: z.number().int() })).query(async ({ ctx, input }) => {
    return prisma.planRadaGodisnji.findFirst({
      where: { korisnikId: ctx.session!.korisnikId, godina: input.godina },
      include: { stavke: { include: { kategorija: true } } },
    });
  }),

  godisnjiUpsert: protectedProcedure.input(
    z.object({
      godina: z.number().int(),
      napomena: z.string().optional(),
      stavke: z.array(
        z.object({
          kategorijaId: z.string().cuid(),
          mesec: z.number().int().min(1).max(12),
          target: z.string(),
          valuta: z.string().length(3),
        }),
      ),
    }),
  ).mutation(async ({ ctx, input }) => {
    const plan = await prisma.planRadaGodisnji.upsert({
      where: {
        pravnoLiceId_korisnikId_godina: {
          pravnoLiceId: ctx.session!.tenantId,
          korisnikId: ctx.session!.korisnikId,
          godina: input.godina,
        },
      },
      update: { napomena: input.napomena },
      create: {
        pravnoLiceId: ctx.session!.tenantId,
        korisnikId: ctx.session!.korisnikId,
        godina: input.godina,
        napomena: input.napomena,
      },
    });
    // Clear existing stavke and write new
    await prisma.planRadaGodisnjiStavka.deleteMany({ where: { planId: plan.id } });
    if (input.stavke.length > 0) {
      await prisma.planRadaGodisnjiStavka.createMany({
        data: input.stavke.map((s) => ({ planId: plan.id, ...s })),
      });
    }
    await audit({ ctx: ctx.session, entitet: "PlanRadaGodisnji", entitetId: plan.id, akcija: "UPDATE", diff: { stavkeBroj: input.stavke.length } });
    return plan;
  }),

  // ===== Dnevni =====
  dnevniList: protectedProcedure.input(
    z.object({ od: z.coerce.date().optional(), do: z.coerce.date().optional(), korisnikId: z.string().cuid().optional() }).optional(),
  ).query(async ({ ctx, input }) => {
    const isManager = hasRole(ctx.session!, "SALES_MANAGER", "COUNTRY_MANAGER", "ADMIN");
    const targetUser = isManager && input?.korisnikId ? input.korisnikId : ctx.session!.korisnikId;
    return prisma.planRadaDnevni.findMany({
      where: {
        pravnoLiceId: ctx.session!.tenantId,
        korisnikId: targetUser,
        ...(input?.od || input?.do ? { datum: { ...(input.od ? { gte: input.od } : {}), ...(input.do ? { lte: input.do } : {}) } } : {}),
      },
      orderBy: { datum: "desc" },
      take: 60,
    });
  }),

  dnevniUpsert: protectedProcedure.input(
    z.object({
      datum: z.coerce.date(),
      opis: z.string().min(1),
      analizaTrzista: z.string().optional(),
    }),
  ).mutation(async ({ ctx, input }) => {
    const plan = await prisma.planRadaDnevni.upsert({
      where: { korisnikId_datum: { korisnikId: ctx.session!.korisnikId, datum: input.datum } },
      update: { opis: input.opis, analizaTrzista: input.analizaTrzista },
      create: {
        pravnoLiceId: ctx.session!.tenantId,
        korisnikId: ctx.session!.korisnikId,
        datum: input.datum,
        opis: input.opis,
        analizaTrzista: input.analizaTrzista,
      },
    });
    await audit({ ctx: ctx.session, entitet: "PlanRadaDnevni", entitetId: plan.id, akcija: "UPDATE" });
    return plan;
  }),
});

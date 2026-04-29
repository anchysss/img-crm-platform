import { z } from "zod";
import { router, withPermission } from "../trpc";
import { prisma } from "@/lib/prisma";
import { tenantWhere, ensureTenant } from "../tenant";
import { audit } from "../audit";
import { AppError } from "../errors";
import { RadniNalogStatus } from "@prisma/client";

export const radniNaloziRouter = router({
  list: withPermission("campaigns", "READ").input(
    z.object({ status: z.nativeEnum(RadniNalogStatus).optional() }).optional(),
  ).query(async ({ ctx, input }) => {
    return prisma.radniNalog.findMany({
      where: { ...tenantWhere(ctx.session!), ...(input?.status ? { status: input.status } : {}) },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }),

  byId: withPermission("campaigns", "READ").input(z.object({ id: z.string().cuid() })).query(async ({ ctx, input }) => {
    const rn = await prisma.radniNalog.findUnique({ where: { id: input.id } });
    if (!rn) return null;
    ensureTenant(ctx.session!, rn.pravnoLiceId);
    const [partner, vlasnik, opp, resenja, montaze, stampe, albumi, postbrendinzi] = await Promise.all([
      prisma.partner.findUnique({ where: { id: rn.partnerId } }),
      prisma.korisnik.findUnique({ where: { id: rn.vlasnikProdajaId } }),
      rn.opportunityId ? prisma.opportunity.findUnique({ where: { id: rn.opportunityId } }) : null,
      prisma.resenje.findMany({ where: { radniNalogId: input.id }, orderBy: { oznaka: "asc" } }),
      prisma.nalogMontazu.findMany({
        where: { radniNalogId: input.id },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { stavke: true } } },
      }),
      prisma.nalogStampu.findMany({
        where: { radniNalogId: input.id },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { stavke: true } } },
      }),
      prisma.fotoAlbum.findMany({
        where: { radniNalogId: input.id },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { fotografije: true } } },
      }),
      prisma.postbrending.findMany({ where: { radniNalogId: input.id }, orderBy: { datum: "desc" } }),
    ]);
    return { ...rn, partner, vlasnik, opportunity: opp, resenja, montaze, stampe, albumi, postbrendinzi };
  }),

  setStatus: withPermission("campaigns", "UPDATE").input(
    z.object({ id: z.string().cuid(), status: z.nativeEnum(RadniNalogStatus), napomena: z.string().optional() }),
  ).mutation(async ({ ctx, input }) => {
    const rn = await prisma.radniNalog.findUnique({ where: { id: input.id } });
    if (!rn) throw new AppError("NOT_FOUND", "Radni nalog ne postoji");
    ensureTenant(ctx.session!, rn.pravnoLiceId);
    const updated = await prisma.radniNalog.update({
      where: { id: input.id },
      data: {
        status: input.status,
        ...(input.napomena ? { napomena: input.napomena } : {}),
        ...(input.status === "PRIHVACEN_LOGISTIKA" && !rn.logistikaId ? { logistikaId: ctx.session!.korisnikId } : {}),
      },
    });
    await audit({ ctx: ctx.session, entitet: "RadniNalog", entitetId: input.id, akcija: "UPDATE", diff: { status: input.status } });
    return updated;
  }),
});

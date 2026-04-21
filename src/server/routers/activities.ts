import { z } from "zod";
import { router, withPermission } from "../trpc";
import { prisma } from "@/lib/prisma";
import { audit } from "../audit";
import { AktivnostTip } from "@prisma/client";

export const activitiesRouter = router({
  listByOpportunity: withPermission("activities", "READ").input(z.object({ opportunityId: z.string().cuid() })).query(async ({ input }) => {
    return prisma.aktivnost.findMany({
      where: { opportunityId: input.opportunityId },
      orderBy: { datum: "desc" },
      include: { autor: true },
    });
  }),

  listByPartner: withPermission("activities", "READ").input(z.object({ partnerId: z.string().cuid() })).query(async ({ input }) => {
    return prisma.aktivnost.findMany({
      where: { partnerId: input.partnerId },
      orderBy: { datum: "desc" },
      include: { autor: true },
      take: 100,
    });
  }),

  create: withPermission("activities", "CREATE").input(
    z.object({
      partnerId: z.string().cuid().optional(),
      kontaktId: z.string().cuid().optional(),
      opportunityId: z.string().cuid().optional(),
      tip: z.nativeEnum(AktivnostTip),
      datum: z.coerce.date().default(() => new Date()),
      opis: z.string().min(1),
      ishod: z.string().optional(),
    }),
  ).mutation(async ({ input, ctx }) => {
    const created = await prisma.aktivnost.create({
      data: { ...input, autorId: ctx.session!.korisnikId },
    });
    await audit({ ctx: ctx.session, entitet: "Aktivnost", entitetId: created.id, akcija: "CREATE", diff: { tip: input.tip } });
    return created;
  }),
});

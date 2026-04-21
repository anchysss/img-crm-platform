import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";

export const lookupsRouter = router({
  stages: protectedProcedure.query(() => prisma.stage.findMany({ where: { aktivan: true }, orderBy: { redosled: "asc" } })),
  lostReasons: protectedProcedure.query(() => prisma.lostReason.findMany({ where: { aktivan: true } })),
  pravnaLica: protectedProcedure.query(() => prisma.pravnoLice.findMany({ orderBy: { kod: "asc" } })),
  role: protectedProcedure.query(() => prisma.rola.findMany({ orderBy: { kod: "asc" } })),
  // Za forme: lista users u trenutnom tenant-u (za vlasnika Opportunity-ja)
  salesReps: protectedProcedure.query(async ({ ctx }) => {
    return prisma.korisnik.findMany({
      where: {
        deletedAt: null,
        aktivan: true,
        roles: { some: { pravnoLiceId: ctx.session!.tenantId, rola: { kod: { in: ["SALES_REP", "SALES_MANAGER", "COUNTRY_MANAGER", "ADMIN"] } } } },
      },
      orderBy: { email: "asc" },
    });
  }),
  partnersShort: protectedProcedure.query(async ({ ctx }) => {
    return prisma.partner.findMany({
      where: { pravnoLiceId: ctx.session!.tenantId, deletedAt: null },
      select: { id: true, naziv: true, tip: true },
      orderBy: { naziv: "asc" },
    });
  }),
});

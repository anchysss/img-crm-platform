import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";

export const notificationsRouter = router({
  list: protectedProcedure.input(z.object({ onlyUnread: z.boolean().default(false) }).optional()).query(async ({ ctx, input }) => {
    return prisma.notifikacija.findMany({
      where: {
        korisnikId: ctx.session!.korisnikId,
        ...(input?.onlyUnread ? { procitano: false } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }),

  markRead: protectedProcedure.input(z.object({ id: z.string().cuid() })).mutation(async ({ ctx, input }) => {
    return prisma.notifikacija.updateMany({
      where: { id: input.id, korisnikId: ctx.session!.korisnikId },
      data: { procitano: true },
    });
  }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    return prisma.notifikacija.updateMany({
      where: { korisnikId: ctx.session!.korisnikId, procitano: false },
      data: { procitano: true },
    });
  }),
});

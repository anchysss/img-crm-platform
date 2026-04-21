import { z } from "zod";
import { router, withPermission } from "../trpc";
import { prisma } from "@/lib/prisma";
import { tenantWhere } from "../tenant";
import { StageKod } from "@prisma/client";

export const pipelineRouter = router({
  kanban: withPermission("pipeline", "READ").input(
    z.object({
      vlasnikId: z.string().cuid().optional(),
      minValue: z.number().optional(),
    }).optional(),
  ).query(async ({ ctx, input }) => {
    const stages = await prisma.stage.findMany({ orderBy: { redosled: "asc" }, where: { aktivan: true } });
    const opps = await prisma.opportunity.findMany({
      where: {
        ...tenantWhere(ctx.session!),
        deletedAt: null,
        ...(input?.vlasnikId ? { vlasnikId: input.vlasnikId } : {}),
        ...(input?.minValue ? { expValue: { gte: String(input.minValue) } } : {}),
      },
      include: { partner: true, vlasnik: true, stage: true },
    });
    return stages.map((s) => ({
      stage: s,
      items: opps.filter((o) => o.stageId === s.id),
    }));
  }),

  funnel: withPermission("pipeline", "READ").query(async ({ ctx }) => {
    const stages = await prisma.stage.findMany({ orderBy: { redosled: "asc" }, where: { aktivan: true } });
    const aggregated = [] as Array<{ kod: StageKod; count: number; weightedValue: number }>;
    for (const s of stages) {
      const items = await prisma.opportunity.findMany({
        where: { ...tenantWhere(ctx.session!), stageId: s.id, deletedAt: null },
        select: { expValue: true, probability: true },
      });
      const weighted = items.reduce((acc, it) => acc + Number(it.expValue) * (it.probability / 100), 0);
      aggregated.push({ kod: s.kod, count: items.length, weightedValue: weighted });
    }
    return aggregated;
  }),
});

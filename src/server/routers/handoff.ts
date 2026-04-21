import { z } from "zod";
import { router, withPermission } from "../trpc";
import { prisma } from "@/lib/prisma";
import { tenantWhere } from "../tenant";
import { audit } from "../audit";
import { HandoffFormat, HandoffStatus } from "@prisma/client";
import { generateHandoffFile } from "@/server/services/handoff";

const formatByPravnoLiceKod: Record<string, HandoffFormat> = {
  SRB: HandoffFormat.SRB_SEF,
  MNE: HandoffFormat.MNE_STD,
  HRV: HandoffFormat.HRV_FINA,
  BIH: HandoffFormat.BIH_STD,
};

export const handoffRouter = router({
  triggerBatch: withPermission("handoff", "CREATE")
    .input(z.object({ odDatum: z.coerce.date(), doDatum: z.coerce.date() }))
    .mutation(async ({ ctx, input }) => {
      const pl = await prisma.pravnoLice.findUnique({ where: { id: ctx.session!.tenantId } });
      if (!pl) throw new Error("Pravno lice ne postoji");
      const format = formatByPravnoLiceKod[pl.kod] ?? HandoffFormat.MNE_STD;

      const dokumenti = await prisma.dokument.findMany({
        where: {
          pravnoLiceId: ctx.session!.tenantId,
          datum: { gte: input.odDatum, lte: input.doDatum },
          tip: { in: ["FAKTURA", "STORNO", "AVANS"] },
        },
      });

      const batch = await prisma.handoffBatch.create({
        data: {
          pravnoLiceId: ctx.session!.tenantId,
          format,
          odDatum: input.odDatum,
          doDatum: input.doDatum,
          status: HandoffStatus.RUNNING,
          brojZapisa: dokumenti.length,
        },
      });

      try {
        const payload = await generateHandoffFile(format, pl.kod, dokumenti);
        for (const d of dokumenti) {
          await prisma.handoffZapis.create({
            data: {
              batchId: batch.id,
              dokumentId: d.id,
              payload: payload.perDocument[d.id] ?? {},
            },
          });
        }
        await prisma.handoffBatch.update({
          where: { id: batch.id },
          data: { status: HandoffStatus.SUCCESS, odredisteUrl: payload.uri },
        });
        await audit({ ctx: ctx.session, entitet: "HandoffBatch", entitetId: batch.id, akcija: "HANDOFF_BATCH", diff: { count: dokumenti.length, format } });
        return { batchId: batch.id, status: "SUCCESS", fileUri: payload.uri };
      } catch (e) {
        await prisma.handoffBatch.update({
          where: { id: batch.id },
          data: { status: HandoffStatus.FAILED, error: (e as Error).message, retryCount: { increment: 1 } },
        });
        throw e;
      }
    }),

  list: withPermission("handoff", "READ").query(async ({ ctx }) => {
    return prisma.handoffBatch.findMany({
      where: tenantWhere(ctx.session!),
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }),
});

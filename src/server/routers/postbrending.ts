import { z } from "zod";
import { router, withPermission } from "../trpc";
import { prisma } from "@/lib/prisma";
import { tenantWhere, ensureTenant } from "../tenant";
import { audit } from "../audit";
import { AppError } from "../errors";

export const postbrendingRouter = router({
  list: withPermission("campaigns", "READ").input(
    z.object({ radniNalogId: z.string().cuid().optional() }).optional(),
  ).query(async ({ ctx, input }) => {
    return prisma.postbrending.findMany({
      where: { ...tenantWhere(ctx.session!), ...(input?.radniNalogId ? { radniNalogId: input.radniNalogId } : {}) },
      orderBy: { datum: "desc" },
      take: 200,
    });
  }),

  byId: withPermission("campaigns", "READ").input(z.object({ id: z.string().cuid() })).query(async ({ ctx, input }) => {
    const pb = await prisma.postbrending.findUnique({
      where: { id: input.id },
      include: { radniNalog: true },
    });
    if (!pb) return null;
    ensureTenant(ctx.session!, pb.pravnoLiceId);
    const partner = await prisma.partner.findUnique({ where: { id: pb.radniNalog.partnerId } });
    return { ...pb, radniNalog: { ...pb.radniNalog, partner } };
  }),

  create: withPermission("campaigns", "CREATE").input(
    z.object({
      radniNalogId: z.string().cuid(),
      fotoAlbumId: z.string().cuid().optional(),
      napomena: z.string().optional(),
    }),
  ).mutation(async ({ ctx, input }) => {
    const rn = await prisma.radniNalog.findUnique({ where: { id: input.radniNalogId } });
    if (!rn) throw new AppError("NOT_FOUND", "Radni nalog ne postoji");
    ensureTenant(ctx.session!, rn.pravnoLiceId);
    const cnt = await prisma.postbrending.count({ where: { radniNalogId: input.radniNalogId } });
    const broj = `${rn.broj}-POSTBRANDING-${cnt + 1}`;
    const created = await prisma.postbrending.create({
      data: {
        pravnoLiceId: rn.pravnoLiceId,
        radniNalogId: input.radniNalogId,
        broj,
        fotoAlbumId: input.fotoAlbumId,
        napomena: input.napomena,
      },
    });
    await audit({ ctx: ctx.session, entitet: "Postbrending", entitetId: created.id, akcija: "CREATE", diff: { broj } });
    return created;
  }),

  setPdfUrl: withPermission("campaigns", "UPDATE").input(
    z.object({ id: z.string().cuid(), pdfUrl: z.string().url() }),
  ).mutation(async ({ ctx, input }) => {
    const pb = await prisma.postbrending.findUnique({ where: { id: input.id } });
    if (!pb) throw new AppError("NOT_FOUND", "Postbrending ne postoji");
    ensureTenant(ctx.session!, pb.pravnoLiceId);
    return prisma.postbrending.update({ where: { id: input.id }, data: { pdfUrl: input.pdfUrl } });
  }),

  markPoslato: withPermission("campaigns", "UPDATE").input(
    z.object({ id: z.string().cuid() }),
  ).mutation(async ({ ctx, input }) => {
    const pb = await prisma.postbrending.findUnique({ where: { id: input.id } });
    if (!pb) throw new AppError("NOT_FOUND", "Postbrending ne postoji");
    ensureTenant(ctx.session!, pb.pravnoLiceId);
    return prisma.postbrending.update({ where: { id: input.id }, data: { poslatoAt: new Date() } });
  }),

  remove: withPermission("campaigns", "DELETE").input(
    z.object({ id: z.string().cuid() }),
  ).mutation(async ({ ctx, input }) => {
    const pb = await prisma.postbrending.findUnique({ where: { id: input.id } });
    if (!pb) throw new AppError("NOT_FOUND", "Postbrending ne postoji");
    ensureTenant(ctx.session!, pb.pravnoLiceId);
    await prisma.postbrending.delete({ where: { id: input.id } });
    return { ok: true };
  }),
});

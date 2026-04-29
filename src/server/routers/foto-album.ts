import { z } from "zod";
import { router, withPermission } from "../trpc";
import { prisma } from "@/lib/prisma";
import { tenantWhere, ensureTenant } from "../tenant";
import { audit } from "../audit";
import { AppError } from "../errors";
import { FotoAlbumTip } from "@prisma/client";

export const fotoAlbumRouter = router({
  list: withPermission("campaigns", "READ").input(
    z.object({ radniNalogId: z.string().cuid().optional() }).optional(),
  ).query(async ({ ctx, input }) => {
    return prisma.fotoAlbum.findMany({
      where: { ...tenantWhere(ctx.session!), ...(input?.radniNalogId ? { radniNalogId: input.radniNalogId } : {}) },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { fotografije: true } } },
      take: 200,
    });
  }),

  byId: withPermission("campaigns", "READ").input(z.object({ id: z.string().cuid() })).query(async ({ ctx, input }) => {
    const a = await prisma.fotoAlbum.findUnique({
      where: { id: input.id },
      include: {
        radniNalog: true,
        fotografije: { orderBy: { redosled: "asc" } },
      },
    });
    if (!a) return null;
    ensureTenant(ctx.session!, a.pravnoLiceId);
    const partner = await prisma.partner.findUnique({ where: { id: a.radniNalog.partnerId } });
    return { ...a, radniNalog: { ...a.radniNalog, partner } };
  }),

  create: withPermission("campaigns", "CREATE").input(
    z.object({
      radniNalogId: z.string().cuid(),
      naziv: z.string().min(1),
      tip: z.nativeEnum(FotoAlbumTip),
    }),
  ).mutation(async ({ ctx, input }) => {
    const rn = await prisma.radniNalog.findUnique({ where: { id: input.radniNalogId } });
    if (!rn) throw new AppError("NOT_FOUND", "Radni nalog ne postoji");
    ensureTenant(ctx.session!, rn.pravnoLiceId);
    const created = await prisma.fotoAlbum.create({
      data: {
        pravnoLiceId: rn.pravnoLiceId,
        radniNalogId: input.radniNalogId,
        naziv: input.naziv,
        tip: input.tip,
      },
    });
    await audit({ ctx: ctx.session, entitet: "FotoAlbum", entitetId: created.id, akcija: "CREATE", diff: { naziv: input.naziv } });
    return created;
  }),

  addFotografija: withPermission("campaigns", "UPDATE").input(
    z.object({
      albumId: z.string().cuid(),
      url: z.string().url(),
      naziv: z.string().optional(),
      redosled: z.coerce.number().int().default(0),
    }),
  ).mutation(async ({ ctx, input }) => {
    const a = await prisma.fotoAlbum.findUnique({ where: { id: input.albumId } });
    if (!a) throw new AppError("NOT_FOUND", "Album ne postoji");
    ensureTenant(ctx.session!, a.pravnoLiceId);
    return prisma.fotografija.create({
      data: { albumId: input.albumId, url: input.url, naziv: input.naziv, redosled: input.redosled },
    });
  }),

  removeFotografija: withPermission("campaigns", "UPDATE").input(
    z.object({ id: z.string().cuid() }),
  ).mutation(async ({ ctx, input }) => {
    const f = await prisma.fotografija.findUnique({ where: { id: input.id }, include: { album: true } });
    if (!f) throw new AppError("NOT_FOUND", "Fotografija ne postoji");
    ensureTenant(ctx.session!, f.album.pravnoLiceId);
    await prisma.fotografija.delete({ where: { id: input.id } });
    return { ok: true };
  }),

  setPdfUrl: withPermission("campaigns", "UPDATE").input(
    z.object({ id: z.string().cuid(), pdfUrl: z.string().url() }),
  ).mutation(async ({ ctx, input }) => {
    const a = await prisma.fotoAlbum.findUnique({ where: { id: input.id } });
    if (!a) throw new AppError("NOT_FOUND", "Album ne postoji");
    ensureTenant(ctx.session!, a.pravnoLiceId);
    return prisma.fotoAlbum.update({ where: { id: input.id }, data: { pdfUrl: input.pdfUrl } });
  }),

  remove: withPermission("campaigns", "DELETE").input(
    z.object({ id: z.string().cuid() }),
  ).mutation(async ({ ctx, input }) => {
    const a = await prisma.fotoAlbum.findUnique({ where: { id: input.id } });
    if (!a) throw new AppError("NOT_FOUND", "Album ne postoji");
    ensureTenant(ctx.session!, a.pravnoLiceId);
    await prisma.fotoAlbum.delete({ where: { id: input.id } });
    return { ok: true };
  }),
});

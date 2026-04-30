import { z } from "zod";
import { router, withPermission } from "../trpc";
import { prisma } from "@/lib/prisma";
import { tenantWhere, ensureTenant } from "../tenant";
import { AppError } from "../errors";

// ============================================================
// Generic CRUD pattern za lookup tabele:
// PaketVozila, Folija, Dorada, Masina, Montazer, PutniTrosak
// Sve tabele su izolovane po tenantu (pravnoLiceId).
// Read-permission: campaigns READ; Write: campaigns CREATE/UPDATE/DELETE
// (Admin/Manager/Logistika imaju campaigns dozvole — Codis ih je već definisao u RBAC.)
// ============================================================

export const logistikaLookupsRouter = router({
  // ---------- PAKETI VOZILA ----------
  paketi: router({
    list: withPermission("campaigns", "READ").query(async ({ ctx }) => {
      return prisma.paketVozila.findMany({
        where: { ...tenantWhere(ctx.session!), aktivan: true },
        orderBy: [{ brojVozila: "asc" }, { naziv: "asc" }],
      });
    }),
    upsert: withPermission("campaigns", "CREATE").input(
      z.object({
        id: z.string().cuid().optional(),
        kod: z.string().min(1),
        naziv: z.string().min(1),
        brojVozila: z.coerce.number().int().min(1),
        sastav: z.string().min(1),
        napomena: z.string().optional(),
        aktivan: z.boolean().default(true),
      }),
    ).mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      if (id) {
        const ex = await prisma.paketVozila.findUnique({ where: { id } });
        if (!ex) throw new AppError("NOT_FOUND", "Paket ne postoji");
        ensureTenant(ctx.session!, ex.pravnoLiceId);
        return prisma.paketVozila.update({ where: { id }, data: rest });
      }
      return prisma.paketVozila.create({ data: { pravnoLiceId: ctx.session!.tenantId, ...rest } });
    }),
    remove: withPermission("campaigns", "DELETE").input(z.object({ id: z.string().cuid() })).mutation(async ({ ctx, input }) => {
      const ex = await prisma.paketVozila.findUnique({ where: { id: input.id } });
      if (!ex) throw new AppError("NOT_FOUND", "Paket ne postoji");
      ensureTenant(ctx.session!, ex.pravnoLiceId);
      await prisma.paketVozila.delete({ where: { id: input.id } });
      return { ok: true };
    }),
  }),

  // ---------- FOLIJE ----------
  folije: router({
    list: withPermission("campaigns", "READ").query(async ({ ctx }) =>
      prisma.folija.findMany({ where: { ...tenantWhere(ctx.session!), aktivan: true }, orderBy: { naziv: "asc" } }),
    ),
    upsert: withPermission("campaigns", "CREATE").input(
      z.object({
        id: z.string().cuid().optional(),
        kod: z.string().min(1),
        naziv: z.string().min(1),
        napomena: z.string().optional(),
        aktivan: z.boolean().default(true),
      }),
    ).mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      if (id) {
        const ex = await prisma.folija.findUnique({ where: { id } });
        if (!ex) throw new AppError("NOT_FOUND", "Folija ne postoji");
        ensureTenant(ctx.session!, ex.pravnoLiceId);
        return prisma.folija.update({ where: { id }, data: rest });
      }
      return prisma.folija.create({ data: { pravnoLiceId: ctx.session!.tenantId, ...rest } });
    }),
    remove: withPermission("campaigns", "DELETE").input(z.object({ id: z.string().cuid() })).mutation(async ({ ctx, input }) => {
      const ex = await prisma.folija.findUnique({ where: { id: input.id } });
      if (!ex) throw new AppError("NOT_FOUND", "Folija ne postoji");
      ensureTenant(ctx.session!, ex.pravnoLiceId);
      await prisma.folija.delete({ where: { id: input.id } });
      return { ok: true };
    }),
  }),

  // ---------- DORADE ----------
  dorade: router({
    list: withPermission("campaigns", "READ").query(async ({ ctx }) =>
      prisma.dorada.findMany({ where: { ...tenantWhere(ctx.session!), aktivan: true }, orderBy: { naziv: "asc" } }),
    ),
    upsert: withPermission("campaigns", "CREATE").input(
      z.object({
        id: z.string().cuid().optional(),
        kod: z.string().min(1),
        naziv: z.string().min(1),
        napomena: z.string().optional(),
        aktivan: z.boolean().default(true),
      }),
    ).mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      if (id) {
        const ex = await prisma.dorada.findUnique({ where: { id } });
        if (!ex) throw new AppError("NOT_FOUND", "Dorada ne postoji");
        ensureTenant(ctx.session!, ex.pravnoLiceId);
        return prisma.dorada.update({ where: { id }, data: rest });
      }
      return prisma.dorada.create({ data: { pravnoLiceId: ctx.session!.tenantId, ...rest } });
    }),
    remove: withPermission("campaigns", "DELETE").input(z.object({ id: z.string().cuid() })).mutation(async ({ ctx, input }) => {
      const ex = await prisma.dorada.findUnique({ where: { id: input.id } });
      if (!ex) throw new AppError("NOT_FOUND", "Dorada ne postoji");
      ensureTenant(ctx.session!, ex.pravnoLiceId);
      await prisma.dorada.delete({ where: { id: input.id } });
      return { ok: true };
    }),
  }),

  // ---------- MAŠINE ----------
  masine: router({
    list: withPermission("campaigns", "READ").query(async ({ ctx }) =>
      prisma.masina.findMany({ where: { ...tenantWhere(ctx.session!), aktivan: true }, orderBy: { naziv: "asc" } }),
    ),
    upsert: withPermission("campaigns", "CREATE").input(
      z.object({
        id: z.string().cuid().optional(),
        kod: z.string().min(1),
        naziv: z.string().min(1),
        napomena: z.string().optional(),
        aktivan: z.boolean().default(true),
      }),
    ).mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      if (id) {
        const ex = await prisma.masina.findUnique({ where: { id } });
        if (!ex) throw new AppError("NOT_FOUND", "Mašina ne postoji");
        ensureTenant(ctx.session!, ex.pravnoLiceId);
        return prisma.masina.update({ where: { id }, data: rest });
      }
      return prisma.masina.create({ data: { pravnoLiceId: ctx.session!.tenantId, ...rest } });
    }),
    remove: withPermission("campaigns", "DELETE").input(z.object({ id: z.string().cuid() })).mutation(async ({ ctx, input }) => {
      const ex = await prisma.masina.findUnique({ where: { id: input.id } });
      if (!ex) throw new AppError("NOT_FOUND", "Mašina ne postoji");
      ensureTenant(ctx.session!, ex.pravnoLiceId);
      await prisma.masina.delete({ where: { id: input.id } });
      return { ok: true };
    }),
  }),

  // ---------- MONTAŽERI ----------
  montazeri: router({
    list: withPermission("campaigns", "READ").query(async ({ ctx }) =>
      prisma.montazer.findMany({ where: { ...tenantWhere(ctx.session!), aktivan: true }, orderBy: { naziv: "asc" } }),
    ),
    upsert: withPermission("campaigns", "CREATE").input(
      z.object({
        id: z.string().cuid().optional(),
        naziv: z.string().min(1),
        kontakt: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        telefon: z.string().optional(),
        napomena: z.string().optional(),
        aktivan: z.boolean().default(true),
      }),
    ).mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const data = { ...rest, email: rest.email || null };
      if (id) {
        const ex = await prisma.montazer.findUnique({ where: { id } });
        if (!ex) throw new AppError("NOT_FOUND", "Montažer ne postoji");
        ensureTenant(ctx.session!, ex.pravnoLiceId);
        return prisma.montazer.update({ where: { id }, data });
      }
      return prisma.montazer.create({ data: { pravnoLiceId: ctx.session!.tenantId, ...data } });
    }),
    remove: withPermission("campaigns", "DELETE").input(z.object({ id: z.string().cuid() })).mutation(async ({ ctx, input }) => {
      const ex = await prisma.montazer.findUnique({ where: { id: input.id } });
      if (!ex) throw new AppError("NOT_FOUND", "Montažer ne postoji");
      ensureTenant(ctx.session!, ex.pravnoLiceId);
      await prisma.montazer.delete({ where: { id: input.id } });
      return { ok: true };
    }),
  }),

  // ---------- PUTNI TROŠKOVI ----------
  putniTroskovi: router({
    list: withPermission("campaigns", "READ").query(async ({ ctx }) =>
      prisma.putniTrosak.findMany({ where: { ...tenantWhere(ctx.session!), aktivan: true }, orderBy: [{ gradOd: "asc" }, { gradDo: "asc" }] }),
    ),
    upsert: withPermission("campaigns", "CREATE").input(
      z.object({
        id: z.string().cuid().optional(),
        gradOd: z.string().min(1),
        gradDo: z.string().min(1),
        kmJedanSmer: z.coerce.number().int().min(0),
        cenaUkupno: z.coerce.number().min(0),
        valuta: z.string().default("RSD"),
        napomena: z.string().optional(),
        aktivan: z.boolean().default(true),
      }),
    ).mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      if (id) {
        const ex = await prisma.putniTrosak.findUnique({ where: { id } });
        if (!ex) throw new AppError("NOT_FOUND", "Putni trošak ne postoji");
        ensureTenant(ctx.session!, ex.pravnoLiceId);
        return prisma.putniTrosak.update({ where: { id }, data: rest });
      }
      return prisma.putniTrosak.create({ data: { pravnoLiceId: ctx.session!.tenantId, ...rest } });
    }),
    remove: withPermission("campaigns", "DELETE").input(z.object({ id: z.string().cuid() })).mutation(async ({ ctx, input }) => {
      const ex = await prisma.putniTrosak.findUnique({ where: { id: input.id } });
      if (!ex) throw new AppError("NOT_FOUND", "Putni trošak ne postoji");
      ensureTenant(ctx.session!, ex.pravnoLiceId);
      await prisma.putniTrosak.delete({ where: { id: input.id } });
      return { ok: true };
    }),
  }),
});

import { z } from "zod";
import { router, withPermission } from "../trpc";
import { prisma } from "@/lib/prisma";
import { tenantWhere, ensureTenant } from "../tenant";
import { audit } from "../audit";
import { AppError } from "../errors";
import { RadniNalogStatus, PripremaStatus } from "@prisma/client";
import { notifyRnStatusChange, notifyPripremaChange } from "../services/notify-workflow";
import { notifyKorekcijaRadniNalog, notifyKorekcijaOdobrena } from "../services/notify-korekcija";

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
    // Workflow notifikacija (best-effort)
    try {
      const partner = await prisma.partner.findUnique({ where: { id: rn.partnerId } });
      await notifyRnStatusChange(
        {
          pravnoLiceId: rn.pravnoLiceId,
          radniNalogId: rn.id,
          broj: rn.broj,
          vlasnikProdajaId: rn.vlasnikProdajaId,
          partnerNaziv: partner?.naziv,
        },
        rn.status,
        input.status,
      );
    } catch (e) {
      console.error("notifyRnStatusChange failed", e);
    }
    return updated;
  }),

  // Priprema fajlova / kolorna proba
  setPriprema: withPermission("campaigns", "UPDATE").input(
    z.object({
      id: z.string().cuid(),
      kolornaProba: z.boolean().optional(),
      pripremaUrl: z.string().url().optional().or(z.literal("")),
      pripremaStatus: z.nativeEnum(PripremaStatus).optional(),
      korekcijaNapomena: z.string().optional(),
    }),
  ).mutation(async ({ ctx, input }) => {
    const rn = await prisma.radniNalog.findUnique({ where: { id: input.id } });
    if (!rn) throw new AppError("NOT_FOUND", "Radni nalog ne postoji");
    ensureTenant(ctx.session!, rn.pravnoLiceId);

    const data: any = {};
    if (input.kolornaProba !== undefined) data.kolornaProba = input.kolornaProba;
    if (input.pripremaUrl !== undefined) data.pripremaUrl = input.pripremaUrl || null;
    if (input.korekcijaNapomena !== undefined) data.korekcijaNapomena = input.korekcijaNapomena;
    if (input.pripremaStatus) {
      data.pripremaStatus = input.pripremaStatus;
      if (input.pripremaStatus === "POSLATA") data.pripremaPoslataAt = new Date();
      if (input.pripremaStatus === "ODOBRENA") {
        data.pripremaOdobrenaAt = new Date();
        data.pripremaOdobrioId = ctx.session!.korisnikId;
      }
    }

    const updated = await prisma.radniNalog.update({ where: { id: input.id }, data });
    await audit({ ctx: ctx.session, entitet: "RadniNalog", entitetId: input.id, akcija: "UPDATE", diff: data });

    if (input.pripremaStatus) {
      try {
        const partner = await prisma.partner.findUnique({ where: { id: rn.partnerId } });
        await notifyPripremaChange(
          {
            pravnoLiceId: rn.pravnoLiceId,
            radniNalogId: rn.id,
            broj: rn.broj,
            vlasnikProdajaId: rn.vlasnikProdajaId,
            partnerNaziv: partner?.naziv,
          },
          input.pripremaStatus,
        );
      } catch (e) {
        console.error("notifyPripremaChange failed", e);
      }
    }
    return updated;
  }),

  // Skraćenica za "Odobri probu" → ODOBRENA + status PROBA_ODOBRENA
  odobriProbu: withPermission("campaigns", "UPDATE").input(
    z.object({ id: z.string().cuid() }),
  ).mutation(async ({ ctx, input }) => {
    const rn = await prisma.radniNalog.findUnique({ where: { id: input.id } });
    if (!rn) throw new AppError("NOT_FOUND", "Radni nalog ne postoji");
    ensureTenant(ctx.session!, rn.pravnoLiceId);
    await prisma.radniNalog.update({
      where: { id: input.id },
      data: {
        pripremaStatus: "ODOBRENA",
        pripremaOdobrenaAt: new Date(),
        pripremaOdobrioId: ctx.session!.korisnikId,
        status: "PROBA_ODOBRENA",
      },
    });
    const partner = await prisma.partner.findUnique({ where: { id: rn.partnerId } });
    const baseCtx = {
      pravnoLiceId: rn.pravnoLiceId,
      radniNalogId: rn.id,
      broj: rn.broj,
      vlasnikProdajaId: rn.vlasnikProdajaId,
      partnerNaziv: partner?.naziv,
    };
    try {
      await notifyPripremaChange(baseCtx, "ODOBRENA");
      await notifyRnStatusChange(baseCtx, rn.status, "PROBA_ODOBRENA");
    } catch (e) {
      console.error("notify failed", e);
    }
    return { ok: true };
  }),

  // Vrati na korekciju
  vratiNaKorekciju: withPermission("campaigns", "UPDATE").input(
    z.object({ id: z.string().cuid(), razlog: z.string().min(1) }),
  ).mutation(async ({ ctx, input }) => {
    const rn = await prisma.radniNalog.findUnique({ where: { id: input.id } });
    if (!rn) throw new AppError("NOT_FOUND", "Radni nalog ne postoji");
    ensureTenant(ctx.session!, rn.pravnoLiceId);
    await prisma.radniNalog.update({
      where: { id: input.id },
      data: {
        pripremaStatus: "KOREKCIJA",
        korekcijaNapomena: input.razlog,
        status: "PRIPREMA_FAJLOVA",
      },
    });
    const partner = await prisma.partner.findUnique({ where: { id: rn.partnerId } });
    try {
      await notifyPripremaChange(
        { pravnoLiceId: rn.pravnoLiceId, radniNalogId: rn.id, broj: rn.broj, vlasnikProdajaId: rn.vlasnikProdajaId, partnerNaziv: partner?.naziv },
        "KOREKCIJA",
      );
      await notifyKorekcijaRadniNalog(rn.id, input.razlog);
    } catch (e) {
      console.error("notify failed", e);
    }
    return { ok: true };
  }),

  odobriKorekciju: withPermission("campaigns", "UPDATE").input(
    z.object({ id: z.string().cuid() }),
  ).mutation(async ({ ctx, input }) => {
    const rn = await prisma.radniNalog.findUnique({ where: { id: input.id } });
    if (!rn) throw new AppError("NOT_FOUND", "Radni nalog ne postoji");
    ensureTenant(ctx.session!, rn.pravnoLiceId);
    await prisma.radniNalog.update({
      where: { id: input.id },
      data: { pripremaStatus: "ODOBRENA", korekcijaNapomena: null },
    });
    await audit({ ctx: ctx.session, entitet: "RadniNalog", entitetId: input.id, akcija: "UPDATE", diff: { korekcija: "ODOBRENA" } });
    try { await notifyKorekcijaOdobrena("RN", input.id); } catch (e) { console.error(e); }
    return { ok: true };
  }),
});

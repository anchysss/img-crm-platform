import { z } from "zod";
import { router, withPermission } from "../trpc";
import { prisma } from "@/lib/prisma";
import { tenantWhere, ensureTenant } from "../tenant";
import { audit } from "../audit";
import { AppError } from "../errors";
import { notifyRoles } from "../services/notify";

export const medijiKampanjeRouter = router({
  // Lista kampanja sa brojem medija (za pregled — strana /dashboard/mediji)
  kampanjeOverview: withPermission("campaigns", "READ").query(async ({ ctx }) => {
    const k = await prisma.kampanja.findMany({
      where: { ...tenantWhere(ctx.session!), deletedAt: null },
      include: {
        partner: { select: { id: true, naziv: true } },
        _count: { select: { mediji: true } },
      },
      orderBy: { odDatum: "desc" },
      take: 200,
    });
    return k.map((x) => ({
      id: x.id,
      naziv: x.naziv,
      status: x.status,
      partner: x.partner.naziv,
      odDatum: x.odDatum,
      doDatum: x.doDatum,
      brojMedija: x._count.mediji,
    }));
  }),

  // Lista medija za izabranu kampanju
  list: withPermission("campaigns", "READ").input(
    z.object({ kampanjaId: z.string().cuid() }),
  ).query(async ({ ctx, input }) => {
    const kamp = await prisma.kampanja.findUnique({
      where: { id: input.kampanjaId },
      select: { id: true, naziv: true, pravnoLiceId: true, partner: { select: { naziv: true } } },
    });
    if (!kamp) throw new AppError("NOT_FOUND", "Kampanja ne postoji");
    ensureTenant(ctx.session!, kamp.pravnoLiceId);

    const mediji = await prisma.medijKampanje.findMany({
      where: { kampanjaId: input.kampanjaId },
      orderBy: { redniBr: "asc" },
    });
    return { kampanja: kamp, mediji };
  }),

  add: withPermission("campaigns", "UPDATE").input(
    z.object({
      kampanjaId: z.string().cuid(),
      url: z.string().url(),
      naziv: z.string().optional(),
      probnaStampa: z.boolean().default(false),
      napomena: z.string().optional(),
    }),
  ).mutation(async ({ ctx, input }) => {
    const kamp = await prisma.kampanja.findUnique({
      where: { id: input.kampanjaId },
      include: { partner: { select: { naziv: true } } },
    });
    if (!kamp) throw new AppError("NOT_FOUND", "Kampanja ne postoji");
    ensureTenant(ctx.session!, kamp.pravnoLiceId);

    const cnt = await prisma.medijKampanje.count({ where: { kampanjaId: input.kampanjaId } });
    const created = await prisma.medijKampanje.create({
      data: {
        pravnoLiceId: kamp.pravnoLiceId,
        kampanjaId: input.kampanjaId,
        url: input.url,
        naziv: input.naziv,
        probnaStampa: input.probnaStampa,
        napomena: input.napomena,
        redniBr: cnt + 1,
        dodaoId: ctx.session!.korisnikId,
      },
    });
    await audit({ ctx: ctx.session, entitet: "MedijKampanje", entitetId: created.id, akcija: "CREATE", diff: { url: input.url, probnaStampa: input.probnaStampa } });

    // Notifikacija logistici (best-effort)
    try {
      await notifyRoles({
        pravnoLiceId: kamp.pravnoLiceId,
        rolaKodovi: ["LOGISTICS", "ADMIN", "COUNTRY_MANAGER"],
        tip: "MEDIJI_DODATI" as any,
        poruka: `Novi medij za kampanju "${kamp.naziv}" (${kamp.partner.naziv})${input.probnaStampa ? " — traži se PROBNA štampa" : ""}.`,
        linkUrl: `/dashboard/mediji?kampanjaId=${kamp.id}`,
      });
    } catch (e) {
      console.error("notify failed", e);
    }
    return created;
  }),

  update: withPermission("campaigns", "UPDATE").input(
    z.object({
      id: z.string().cuid(),
      url: z.string().url().optional(),
      naziv: z.string().optional(),
      probnaStampa: z.boolean().optional(),
      napomena: z.string().optional(),
    }),
  ).mutation(async ({ ctx, input }) => {
    const m = await prisma.medijKampanje.findUnique({ where: { id: input.id } });
    if (!m) throw new AppError("NOT_FOUND", "Medij ne postoji");
    ensureTenant(ctx.session!, m.pravnoLiceId);
    const { id, ...rest } = input;
    return prisma.medijKampanje.update({ where: { id }, data: rest });
  }),

  remove: withPermission("campaigns", "DELETE").input(
    z.object({ id: z.string().cuid() }),
  ).mutation(async ({ ctx, input }) => {
    const m = await prisma.medijKampanje.findUnique({ where: { id: input.id } });
    if (!m) throw new AppError("NOT_FOUND", "Medij ne postoji");
    ensureTenant(ctx.session!, m.pravnoLiceId);
    await prisma.medijKampanje.delete({ where: { id: input.id } });
    return { ok: true };
  }),

  // Manualni reSend notifikacije logistici (kad korisnik završi unos)
  notifyLogistiku: withPermission("campaigns", "UPDATE").input(
    z.object({ kampanjaId: z.string().cuid() }),
  ).mutation(async ({ ctx, input }) => {
    const kamp = await prisma.kampanja.findUnique({
      where: { id: input.kampanjaId },
      include: { partner: { select: { naziv: true } }, _count: { select: { mediji: true } } },
    });
    if (!kamp) throw new AppError("NOT_FOUND", "Kampanja ne postoji");
    ensureTenant(ctx.session!, kamp.pravnoLiceId);
    const probnaCount = await prisma.medijKampanje.count({ where: { kampanjaId: input.kampanjaId, probnaStampa: true } });
    await notifyRoles({
      pravnoLiceId: kamp.pravnoLiceId,
      rolaKodovi: ["LOGISTICS", "ADMIN", "COUNTRY_MANAGER"],
      tip: "MEDIJI_DODATI" as any,
      poruka: `Mediji za kampanju "${kamp.naziv}" (${kamp.partner.naziv}) — ${kamp._count.mediji} fajl(ova), od toga ${probnaCount} sa probnom štampom.`,
      linkUrl: `/dashboard/mediji?kampanjaId=${kamp.id}`,
    });
    return { ok: true };
  }),
});

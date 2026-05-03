import { z } from "zod";
import { router, withPermission } from "../trpc";
import { prisma } from "@/lib/prisma";
import { tenantWhere, ensureTenant } from "../tenant";
import { audit } from "../audit";
import { AppError } from "../errors";
import { VoziloTip, VoziloStatus, PozicijaTip, TipOglasa, JedinicaMere } from "@prisma/client";

const vozilofields = {
  sifra: z.string().optional(),
  dobavljac: z.string().optional(), // PREVOZNIK (label change u UI-ju)
  tipVozilaTxt: z.string().optional(),
  registracija: z.string().min(1).max(40),
  inventurniBroj: z.string().optional(),
  oznaka: z.string().optional(),
  garaza: z.string().optional(),
  linija: z.array(z.string()).optional(),
  zakupOd: z.coerce.date().optional(),
  zakupDo: z.coerce.date().optional(),
  aktivan: z.boolean().optional(),
  model: z.string().optional(),
  gps: z.boolean().optional(),
  opis: z.string().optional(),
  brojUgovora: z.string().optional(),
  komNaknadaDatumDo: z.coerce.date().optional(),
  // Skice (slike pozicija brendinga)
  skicaSpoljnaUrl: z.string().url().optional().or(z.literal("")),
  skicaUnutrasnjaUrl: z.string().url().optional().or(z.literal("")),
  // Digital
  routerBroj: z.string().optional(),
  kameraBroj: z.string().optional(),
  // Tipovi brendinga koje vozilo PODRŽAVA
  podrzaniTipoviBrendinga: z.array(z.nativeEnum(TipOglasa)).optional(),
  // Postojeća polja
  tip: z.nativeEnum(VoziloTip),
  zemlja: z.string().length(2),
  grad: z.string().min(1),
  slikaUrl: z.string().url().optional().or(z.literal("")),
  status: z.nativeEnum(VoziloStatus).optional(),
};

export const vehiclesRouter = router({
  list: withPermission("vehicles", "READ").input(
    z.object({
      grad: z.string().optional(),
      tip: z.nativeEnum(VoziloTip).optional(),
      status: z.nativeEnum(VoziloStatus).optional(),
      garaza: z.string().optional(),
      dobavljac: z.string().optional(),
      q: z.string().optional(),
    }).optional(),
  ).query(async ({ ctx, input }) => {
    return prisma.vozilo.findMany({
      where: {
        ...tenantWhere(ctx.session!),
        deletedAt: null,
        ...(input?.grad ? { grad: input.grad } : {}),
        ...(input?.tip ? { tip: input.tip } : {}),
        ...(input?.status ? { status: input.status } : {}),
        ...(input?.garaza ? { garaza: input.garaza } : {}),
        ...(input?.dobavljac ? { dobavljac: { contains: input.dobavljac, mode: "insensitive" } } : {}),
        ...(input?.q ? {
          OR: [
            { registracija: { contains: input.q, mode: "insensitive" } },
            { inventurniBroj: { contains: input.q, mode: "insensitive" } },
            { sifra: { contains: input.q, mode: "insensitive" } },
            { model: { contains: input.q, mode: "insensitive" } },
          ],
        } : {}),
      },
      include: { pozicije: true },
      orderBy: [{ garaza: "asc" }, { inventurniBroj: "asc" }, { registracija: "asc" }],
    });
  }),

  distinctGaraza: withPermission("vehicles", "READ").query(async ({ ctx }) => {
    const rows = await prisma.vozilo.findMany({
      where: { ...tenantWhere(ctx.session!), deletedAt: null, garaza: { not: null } },
      select: { garaza: true },
      distinct: ["garaza"],
    });
    return rows.map((r) => r.garaza).filter(Boolean) as string[];
  }),

  distinctDobavljac: withPermission("vehicles", "READ").query(async ({ ctx }) => {
    const rows = await prisma.vozilo.findMany({
      where: { ...tenantWhere(ctx.session!), deletedAt: null, dobavljac: { not: null } },
      select: { dobavljac: true },
      distinct: ["dobavljac"],
    });
    return rows.map((r) => r.dobavljac).filter(Boolean) as string[];
  }),

  byId: withPermission("vehicles", "READ").input(z.object({ id: z.string().cuid() })).query(async ({ ctx, input }) => {
    const v = await prisma.vozilo.findUnique({
      where: { id: input.id },
      include: {
        pozicije: true,
        komunalneNaknade: { orderBy: { doDatum: "desc" } },
        ceneZakupa: { orderBy: { tipBrendinga: "asc" } },
      },
    });
    if (!v) return null;
    ensureTenant(ctx.session!, v.pravnoLiceId);
    return v;
  }),

  // Postavi cenu zakupa za tip brendinga (upsert)
  setCenaZakupa: withPermission("vehicles", "UPDATE").input(
    z.object({
      voziloId: z.string().cuid(),
      tipBrendinga: z.nativeEnum(TipOglasa),
      cena: z.string(),
      valuta: z.string().length(3),
      jedinicaMere: z.nativeEnum(JedinicaMere).default(JedinicaMere.PER_WEEK),
      napomena: z.string().optional(),
    }),
  ).mutation(async ({ ctx, input }) => {
    const v = await prisma.vozilo.findUnique({ where: { id: input.voziloId } });
    if (!v) throw new AppError("NOT_FOUND", "Vozilo ne postoji");
    ensureTenant(ctx.session!, v.pravnoLiceId);
    const result = await prisma.voziloCenaZakupa.upsert({
      where: { voziloId_tipBrendinga: { voziloId: input.voziloId, tipBrendinga: input.tipBrendinga } },
      update: { cena: input.cena, valuta: input.valuta, jedinicaMere: input.jedinicaMere, napomena: input.napomena },
      create: input,
    });
    await audit({ ctx: ctx.session, entitet: "VoziloCenaZakupa", entitetId: result.id, akcija: "UPDATE", diff: { tip: input.tipBrendinga, cena: input.cena } });
    return result;
  }),

  removeCenaZakupa: withPermission("vehicles", "UPDATE").input(
    z.object({ id: z.string().cuid() }),
  ).mutation(async ({ ctx, input }) => {
    const cena = await prisma.voziloCenaZakupa.findUnique({ where: { id: input.id }, include: { vozilo: true } });
    if (!cena) throw new AppError("NOT_FOUND", "Cena ne postoji");
    ensureTenant(ctx.session!, cena.vozilo.pravnoLiceId);
    await prisma.voziloCenaZakupa.delete({ where: { id: input.id } });
    return { ok: true };
  }),

  reservationsForVehicle: withPermission("vehicles", "READ").input(z.object({ id: z.string().cuid() })).query(async ({ ctx, input }) => {
    const v = await prisma.vozilo.findUnique({ where: { id: input.id } });
    if (!v) return [];
    ensureTenant(ctx.session!, v.pravnoLiceId);
    return prisma.rezervacija.findMany({
      where: { pozicija: { voziloId: input.id } },
      include: {
        pozicija: true,
        kampanja: { include: { partner: true } },
        opportunity: { include: { partner: true } },
      },
      orderBy: { odDatum: "desc" },
    });
  }),

  create: withPermission("vehicles", "CREATE").input(z.object(vozilofields)).mutation(async ({ input, ctx }) => {
    const created = await prisma.vozilo.create({
      data: {
        ...input,
        pravnoLiceId: ctx.session!.tenantId,
        linija: input.linija ?? [],
      },
    });
    await audit({ ctx: ctx.session, entitet: "Vozilo", entitetId: created.id, akcija: "CREATE", diff: { registracija: input.registracija, inventurniBroj: input.inventurniBroj } });
    return created;
  }),

  update: withPermission("vehicles", "UPDATE").input(
    z.object({ id: z.string().cuid() }).merge(z.object(vozilofields).partial()),
  ).mutation(async ({ input, ctx }) => {
    const { id, ...rest } = input;
    const existing = await prisma.vozilo.findUnique({ where: { id } });
    if (!existing) throw new AppError("NOT_FOUND", "Vozilo ne postoji");
    ensureTenant(ctx.session!, existing.pravnoLiceId);
    const updated = await prisma.vozilo.update({ where: { id }, data: rest });
    await audit({ ctx: ctx.session, entitet: "Vozilo", entitetId: id, akcija: "UPDATE", diff: rest as any });
    return updated;
  }),

  updateStatus: withPermission("vehicles", "UPDATE").input(
    z.object({ id: z.string().cuid(), status: z.nativeEnum(VoziloStatus) }),
  ).mutation(async ({ input, ctx }) => {
    const existing = await prisma.vozilo.findUnique({ where: { id: input.id } });
    if (!existing) throw new AppError("NOT_FOUND", "Vozilo ne postoji");
    ensureTenant(ctx.session!, existing.pravnoLiceId);
    const updated = await prisma.vozilo.update({ where: { id: input.id }, data: { status: input.status } });
    await audit({ ctx: ctx.session, entitet: "Vozilo", entitetId: input.id, akcija: "UPDATE", diff: { status: input.status } });

    // Side-effect: kad vozilo postaje nedostupno, notifikuj logistiku + agente prodaje
    const NEDOSTUPNI = ["KVAR", "SERVIS", "NA_FARBANJU", "POVUCENO", "SIHTA"];
    if (NEDOSTUPNI.includes(input.status) && !NEDOSTUPNI.includes(existing.status)) {
      try {
        const { notifyVoziloNedostupno } = await import("../services/notify-vozilo");
        await notifyVoziloNedostupno(input.id, input.status);
      } catch (e) {
        console.error("notifyVoziloNedostupno failed", e);
      }
    }
    return updated;
  }),

  // Lista pogođenih kampanja za dato vozilo
  pogodjeneKampanje: withPermission("vehicles", "READ").input(
    z.object({ voziloId: z.string().cuid() }),
  ).query(async ({ ctx, input }) => {
    const v = await prisma.vozilo.findUnique({ where: { id: input.voziloId } });
    if (!v) return [];
    ensureTenant(ctx.session!, v.pravnoLiceId);
    const { findKampanjeZaVozilo } = await import("../services/notify-vozilo");
    return findKampanjeZaVozilo(input.voziloId);
  }),

  // Zameni vozilo u konkretnoj KampanjaStavki — premešta poziciju + rezervaciju
  zameniUKampanji: withPermission("campaigns", "UPDATE").input(
    z.object({
      kampanjaStavkaId: z.string().cuid(),
      novaPozicijaId: z.string().cuid(),
    }),
  ).mutation(async ({ ctx, input }) => {
    const stavka = await prisma.kampanjaStavka.findUnique({
      where: { id: input.kampanjaStavkaId },
      include: { kampanja: { include: { partner: true, opportunity: { select: { vlasnikId: true } } } }, pozicija: true },
    });
    if (!stavka) throw new AppError("NOT_FOUND", "Stavka ne postoji");
    ensureTenant(ctx.session!, stavka.kampanja.pravnoLiceId);

    const novaPoz = await prisma.pozicija.findUnique({ where: { id: input.novaPozicijaId }, include: { vozilo: true } });
    if (!novaPoz) throw new AppError("NOT_FOUND", "Nova pozicija ne postoji");
    ensureTenant(ctx.session!, novaPoz.vozilo.pravnoLiceId);

    // Update stavku + cancel staru rezervaciju + create novu
    const staraPozicijaId = stavka.pozicijaId;
    await prisma.$transaction([
      prisma.kampanjaStavka.update({ where: { id: stavka.id }, data: { pozicijaId: input.novaPozicijaId } }),
      prisma.rezervacija.updateMany({
        where: {
          kampanjaId: stavka.kampanjaId,
          pozicijaId: staraPozicijaId,
          status: { in: ["CONFIRMED", "RUNNING", "HOLD"] },
        },
        data: { status: "CANCELLED" },
      }),
      prisma.rezervacija.create({
        data: {
          pozicijaId: input.novaPozicijaId,
          kampanjaId: stavka.kampanjaId,
          status: "CONFIRMED",
          odDatum: stavka.odDatum,
          doDatum: stavka.doDatum,
        },
      }),
    ]);
    await audit({
      ctx: ctx.session,
      entitet: "KampanjaStavka",
      entitetId: stavka.id,
      akcija: "UPDATE",
      diff: { staraPozicijaId, novaPozicijaId: input.novaPozicijaId },
    });

    // Notifikuj agenta prodaje
    const vlasnikId = stavka.kampanja.opportunity?.vlasnikId;
    if (vlasnikId) {
      const { notify } = await import("../services/notify");
      try {
        await notify({
          pravnoLiceId: stavka.kampanja.pravnoLiceId,
          korisnikId: vlasnikId,
          tip: "VOZILO_NEDOSTUPNO_KAMPANJA" as any,
          poruka: `Vozilo zamenjeno u kampanji "${stavka.kampanja.naziv}" (${stavka.kampanja.partner.naziv}) — novo vozilo: ${novaPoz.vozilo.sifra ?? novaPoz.vozilo.registracija}.`,
          linkUrl: `/logistika/kampanje/${stavka.kampanjaId}`,
        });
      } catch (e) { console.error(e); }
    }
    return { ok: true };
  }),

  addPosition: withPermission("positions", "CREATE").input(
    z.object({
      voziloId: z.string().cuid(),
      tip: z.nativeEnum(PozicijaTip),
      dimenzije: z.string().optional(),
      minPeriodDana: z.number().min(1).default(7),
      cenaPoPeriodu: z.string(),
      valuta: z.string().length(3),
    }),
  ).mutation(async ({ input, ctx }) => {
    const v = await prisma.vozilo.findUnique({ where: { id: input.voziloId } });
    if (!v) throw new AppError("NOT_FOUND", "Vozilo ne postoji");
    ensureTenant(ctx.session!, v.pravnoLiceId);
    const created = await prisma.pozicija.create({ data: input });
    await audit({ ctx: ctx.session, entitet: "Pozicija", entitetId: created.id, akcija: "CREATE", diff: { voziloId: input.voziloId } });
    return created;
  }),

  addCommunalFee: withPermission("vehicles", "UPDATE").input(
    z.object({
      voziloId: z.string().cuid(),
      odDatum: z.coerce.date(),
      doDatum: z.coerce.date(),
      iznos: z.string(),
      valuta: z.string().length(3),
      napomena: z.string().optional(),
    }),
  ).mutation(async ({ input, ctx }) => {
    const created = await prisma.komunalnaNaknada.create({ data: input });
    await audit({ ctx: ctx.session, entitet: "KomunalnaNaknada", entitetId: created.id, akcija: "CREATE" });
    // Cache date on vozilo for quick access
    await prisma.vozilo.update({
      where: { id: input.voziloId },
      data: { komNaknadaDatumDo: input.doDatum },
    });
    return created;
  }),

  // Bulk import sa 17-kolonskim bcMediaBox CSV formatom
  bulkImport: withPermission("vehicles", "CREATE").input(
    z.object({
      rows: z.array(z.object({
        sifra: z.string().optional(),
        lokacija: z.string().optional(),
        dobavljac: z.string().optional(),
        tipVozila: z.string().optional(),
        registracija: z.string().min(1),
        inventurniBroj: z.string().optional(),
        oznaka: z.string().optional(),
        garaza: z.string().optional(),
        linija: z.string().optional(), // string iz CSV-a, split po ; ili |
        od: z.string().optional(),
        do: z.string().optional(),
        aktivan: z.string().optional(), // "DA"/"NE" ili boolean
        model: z.string().optional(),
        gps: z.string().optional(),
        opis: z.string().optional(),
        brojUgovora: z.string().optional(),
        komNaknadaDatumDo: z.string().optional(),
      })),
    }),
  ).mutation(async ({ input, ctx }) => {
    let created = 0;
    let skipped = 0;
    const errors: Array<{ row: number; error: string }> = [];

    const parseDate = (s?: string) => {
      if (!s || !s.trim()) return undefined;
      const d = new Date(s);
      return Number.isNaN(d.getTime()) ? undefined : d;
    };
    const parseBool = (s?: string) => {
      if (!s) return undefined;
      const v = s.trim().toUpperCase();
      return v === "DA" || v === "TRUE" || v === "1" || v === "YES" ? true : v === "NE" || v === "FALSE" || v === "0" || v === "NO" ? false : undefined;
    };
    const inferTip = (txt?: string): VoziloTip => {
      if (!txt) return VoziloTip.BUS;
      const t = txt.toUpperCase();
      if (t.includes("TRAMVAJ")) return VoziloTip.TRAMVAJ;
      if (t.includes("TROLEJ")) return VoziloTip.TROLEJBUS;
      if (t.includes("ZGLOB")) return VoziloTip.BUS_ZGLOBNI;
      if (t.includes("MINI")) return VoziloTip.MINI;
      if (t.includes("AUTOBUS") || t.includes("BUS")) return VoziloTip.BUS;
      return VoziloTip.DRUGO;
    };
    const inferStatus = (opis?: string, aktivan?: boolean): VoziloStatus => {
      if (!opis && aktivan === false) return VoziloStatus.POVUCENO;
      const t = (opis ?? "").toUpperCase();
      if (t.includes("KVAR")) return VoziloStatus.KVAR;
      if (t.includes("FARBAN")) return VoziloStatus.NA_FARBANJU;
      if (t.includes("ŠIHTA") || t.includes("SIHTA")) return VoziloStatus.SIHTA;
      if (t.includes("RASHOD") || t.includes("POVUČEN") || t.includes("POVUCEN")) return VoziloStatus.POVUCENO;
      if (t.includes("SERVIS")) return VoziloStatus.SERVIS;
      if (t.includes("U ZAKUPU")) return VoziloStatus.U_ZAKUPU;
      return aktivan === false ? VoziloStatus.POVUCENO : VoziloStatus.AKTIVNO;
    };

    for (let i = 0; i < input.rows.length; i++) {
      const r = input.rows[i];
      try {
        const existing = await prisma.vozilo.findFirst({
          where: { pravnoLiceId: ctx.session!.tenantId, registracija: r.registracija },
        });
        if (existing) { skipped++; continue; }
        const aktivan = parseBool(r.aktivan);
        await prisma.vozilo.create({
          data: {
            pravnoLiceId: ctx.session!.tenantId,
            sifra: r.sifra,
            dobavljac: r.dobavljac,
            tipVozilaTxt: r.tipVozila,
            registracija: r.registracija,
            inventurniBroj: r.inventurniBroj,
            oznaka: r.oznaka,
            garaza: r.garaza,
            linija: r.linija ? r.linija.split(/[;|]/).map((x) => x.trim()).filter(Boolean) : [],
            zakupOd: parseDate(r.od),
            zakupDo: parseDate(r.do),
            aktivan: aktivan ?? true,
            model: r.model,
            gps: parseBool(r.gps) ?? false,
            opis: r.opis,
            brojUgovora: r.brojUgovora,
            komNaknadaDatumDo: parseDate(r.komNaknadaDatumDo),
            tip: inferTip(r.tipVozila),
            grad: r.lokacija ?? "—",
            zemlja: "RS", // default na trenutni tenant; override kroz UI edit
            status: inferStatus(r.opis, aktivan),
          },
        });
        created++;
      } catch (e: any) {
        errors.push({ row: i + 2, error: e.message }); // +2 za Excel (header + 1-based)
      }
    }
    await audit({
      ctx: ctx.session,
      entitet: "Vozilo",
      entitetId: `bulk:${created}`,
      akcija: "CREATE",
      diff: { created, skipped, errorsCount: errors.length },
    });
    return { ok: true, created, skipped, errors };
  }),

  // Pronađi alternative za vozilo: isti tip + bar 1 zajednička linija + isti
  // proizvođač (model startsWith match na prvoj reči), aktivno, bez konflikta
  // u traženom periodu
  findAlternatives: withPermission("vehicles", "READ").input(
    z.object({
      voziloId: z.string().cuid(),
      odDatum: z.coerce.date(),
      doDatum: z.coerce.date(),
    }),
  ).query(async ({ ctx, input }) => {
    const v = await prisma.vozilo.findUnique({ where: { id: input.voziloId } });
    if (!v) return [];
    ensureTenant(ctx.session!, v.pravnoLiceId);

    // Heuristika za "proizvođač" — prva reč modela (npr "Mercedes Citaro" → "Mercedes")
    const proizvodjac = v.model?.split(/\s+/)[0]?.toLowerCase() ?? null;

    const kandidati = await prisma.vozilo.findMany({
      where: {
        pravnoLiceId: v.pravnoLiceId,
        deletedAt: null,
        aktivan: true,
        status: "AKTIVNO",
        tip: v.tip, // isti tip (BUS/BUS_ZGLOBNI/TRAMVAJ/...)
        id: { not: v.id },
      },
      include: {
        pozicije: {
          include: {
            rezervacije: {
              where: {
                status: { in: ["CONFIRMED", "RUNNING", "HOLD"] },
                odDatum: { lte: input.doDatum },
                doDatum: { gte: input.odDatum },
              },
            },
          },
        },
      },
      take: 50,
    });

    return kandidati
      .map((k) => {
        const slobodno = k.pozicije.every((p) => p.rezervacije.length === 0);
        const proizvodjacMatch = proizvodjac
          ? (k.model?.toLowerCase().startsWith(proizvodjac) ?? false)
          : false;
        const linijeMatch = v.linija.length > 0 && k.linija.some((l) => v.linija.includes(l));
        const score = (slobodno ? 100 : 0) + (proizvodjacMatch ? 30 : 0) + (linijeMatch ? 20 : 0);
        return {
          id: k.id,
          sifra: k.sifra,
          registracija: k.registracija,
          model: k.model,
          tipVozilaTxt: k.tipVozilaTxt,
          tip: k.tip,
          garaza: k.garaza,
          linija: k.linija,
          slobodno,
          proizvodjacMatch,
          linijeMatch,
          score,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }),
});

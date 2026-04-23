import { z } from "zod";
import { router, withPermission } from "../trpc";
import { prisma } from "@/lib/prisma";
import { audit } from "../audit";
import { PartnerTip, Segment, VoziloTip, LegalBasis } from "@prisma/client";

/**
 * Bulk import endpoints. Svi primaju niz već parsiranih redova (UI parsira CSV/XLSX klijentski).
 * Vraća { ok, created, skipped, errors[] }.
 */
export const importsRouter = router({
  partners: withPermission("partners", "CREATE").input(
    z.object({
      rows: z.array(
        z.object({
          naziv: z.string().min(1),
          tip: z.nativeEnum(PartnerTip).default(PartnerTip.DIRECT),
          segment: z.nativeEnum(Segment).default(Segment.C),
          zemlja: z.string().length(2).optional(),
          grad: z.string().optional(),
          pibVat: z.string().optional(),
          maticniBroj: z.string().optional(),
          adresa: z.string().optional(),
          napomene: z.string().optional(),
        }),
      ),
    }),
  ).mutation(async ({ ctx, input }) => {
    let created = 0;
    let skipped = 0;
    const errors: Array<{ row: number; error: string }> = [];
    for (let i = 0; i < input.rows.length; i++) {
      const r = input.rows[i];
      try {
        const existing = await prisma.partner.findFirst({
          where: { pravnoLiceId: ctx.session!.tenantId, naziv: r.naziv, deletedAt: null },
        });
        if (existing) { skipped++; continue; }
        await prisma.partner.create({
          data: {
            pravnoLiceId: ctx.session!.tenantId,
            naziv: r.naziv,
            tip: r.tip,
            segment: r.segment,
            zemlja: r.zemlja ?? "RS",
            grad: r.grad,
            pibVat: r.pibVat,
            maticniBroj: r.maticniBroj,
            adresa: r.adresa,
            napomene: r.napomene,
            createdBy: ctx.session!.korisnikId,
          },
        });
        created++;
      } catch (e: any) {
        errors.push({ row: i + 1, error: e.message });
      }
    }
    await audit({ ctx: ctx.session, entitet: "Partner", entitetId: `bulk:${created}`, akcija: "CREATE", diff: { created, skipped, errors: errors.length } });
    return { ok: true, created, skipped, errors };
  }),

  kontakti: withPermission("contacts", "CREATE").input(
    z.object({
      rows: z.array(
        z.object({
          partnerNaziv: z.string().min(1), // za lookup
          ime: z.string().min(1),
          email: z.string().email().optional(),
          telefon: z.string().optional(),
          pozicija: z.string().optional(),
          primarni: z.boolean().default(false),
          legalBasis: z.nativeEnum(LegalBasis).default(LegalBasis.LEGITIMATE_INTEREST),
        }),
      ),
    }),
  ).mutation(async ({ ctx, input }) => {
    let created = 0;
    let skipped = 0;
    const errors: Array<{ row: number; error: string }> = [];
    for (let i = 0; i < input.rows.length; i++) {
      const r = input.rows[i];
      try {
        const partner = await prisma.partner.findFirst({
          where: { pravnoLiceId: ctx.session!.tenantId, naziv: r.partnerNaziv, deletedAt: null },
        });
        if (!partner) { errors.push({ row: i + 1, error: `Partner "${r.partnerNaziv}" ne postoji` }); continue; }
        if (r.email) {
          const existing = await prisma.kontakt.findFirst({ where: { partnerId: partner.id, email: r.email } });
          if (existing) { skipped++; continue; }
        }
        await prisma.kontakt.create({
          data: {
            partnerId: partner.id,
            ime: r.ime,
            email: r.email,
            telefon: r.telefon,
            pozicija: r.pozicija,
            primarni: r.primarni,
            legalBasis: r.legalBasis,
            izvor: "bulk-import",
          },
        });
        created++;
      } catch (e: any) {
        errors.push({ row: i + 1, error: e.message });
      }
    }
    await audit({ ctx: ctx.session, entitet: "Kontakt", entitetId: `bulk:${created}`, akcija: "CREATE", diff: { created, skipped } });
    return { ok: true, created, skipped, errors };
  }),

  vozila: withPermission("vehicles", "CREATE").input(
    z.object({
      rows: z.array(
        z.object({
          registracija: z.string().min(1),
          tip: z.nativeEnum(VoziloTip).default(VoziloTip.BUS),
          grad: z.string().min(1),
          zemlja: z.string().length(2).optional(),
        }),
      ),
    }),
  ).mutation(async ({ ctx, input }) => {
    let created = 0;
    let skipped = 0;
    const errors: Array<{ row: number; error: string }> = [];
    for (let i = 0; i < input.rows.length; i++) {
      const r = input.rows[i];
      try {
        const existing = await prisma.vozilo.findFirst({
          where: { pravnoLiceId: ctx.session!.tenantId, registracija: r.registracija },
        });
        if (existing) { skipped++; continue; }
        await prisma.vozilo.create({
          data: {
            pravnoLiceId: ctx.session!.tenantId,
            registracija: r.registracija,
            tip: r.tip,
            grad: r.grad,
            zemlja: r.zemlja ?? "RS",
          },
        });
        created++;
      } catch (e: any) {
        errors.push({ row: i + 1, error: e.message });
      }
    }
    await audit({ ctx: ctx.session, entitet: "Vozilo", entitetId: `bulk:${created}`, akcija: "CREATE", diff: { created, skipped } });
    return { ok: true, created, skipped, errors };
  }),
});

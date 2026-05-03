/**
 * Notifikacije i monitoring za vozila i kampanje:
 * - notifyVoziloNedostupno(voziloId) — kad vozilo postane nedostupno (KVAR, SIHTA…),
 *   pronaći aktivne i buduće kampanje koje koriste pozicije tog vozila, notifikovati
 *   logistiku sa listom pogođenih kampanja.
 * - notifyKampanjaRokWarning(...) — pomoćna notifikacija agenta prodaje kad se rok
 *   korekcije/montaže/štampe približi ili preklopi sa odDatum kampanje.
 */
import { prisma } from "@/lib/prisma";
import { notify, notifyRoles } from "./notify";
import { sendEmail } from "./email";

const APP_URL = process.env.NEXTAUTH_URL ?? "https://img-crm-platform.vercel.app";
const ROLE_LOGISTIKA = ["LOGISTICS", "ADMIN", "COUNTRY_MANAGER"];

interface PogodjenaKampanja {
  kampanjaId: string;
  kampanjaNaziv: string;
  partnerNaziv: string;
  pozicijaId: string;
  odDatum: Date;
  doDatum: Date;
  vlasnikProdajaId: string | null;
}

export async function findKampanjeZaVozilo(voziloId: string, after?: Date): Promise<PogodjenaKampanja[]> {
  const cutoff = after ?? new Date();
  const stavke = await prisma.kampanjaStavka.findMany({
    where: {
      pozicija: { voziloId },
      doDatum: { gte: cutoff }, // aktivne i buduće
      kampanja: { deletedAt: null, status: { in: ["POTVRDENA", "U_REALIZACIJI"] } },
    },
    include: {
      pozicija: true,
      kampanja: {
        include: {
          partner: { select: { id: true, naziv: true } },
          opportunity: { select: { vlasnikId: true } },
        },
      },
    },
  });
  // Dedup po kampanjaId
  const map = new Map<string, PogodjenaKampanja>();
  for (const s of stavke) {
    if (map.has(s.kampanja.id)) continue;
    map.set(s.kampanja.id, {
      kampanjaId: s.kampanja.id,
      kampanjaNaziv: s.kampanja.naziv,
      partnerNaziv: s.kampanja.partner.naziv,
      pozicijaId: s.pozicija.id,
      odDatum: s.odDatum,
      doDatum: s.doDatum,
      vlasnikProdajaId: s.kampanja.opportunity?.vlasnikId ?? null,
    });
  }
  return Array.from(map.values());
}

export async function notifyVoziloNedostupno(voziloId: string, noviStatus: string) {
  const v = await prisma.vozilo.findUnique({ where: { id: voziloId } });
  if (!v) return { ok: false, reason: "vozilo_not_found" };

  const pogodjene = await findKampanjeZaVozilo(voziloId);
  if (pogodjene.length === 0) {
    return { ok: true, pogodjeneCount: 0 };
  }

  const linkUrl = `/logistika/vozila/${v.id}`;
  const sifraTxt = v.sifra ?? v.registracija;
  const naslov = `Vozilo ${sifraTxt} → ${noviStatus} (pogođeno ${pogodjene.length} kampanja)`;
  const lista = pogodjene.map((p) => `• ${p.kampanjaNaziv} (${p.partnerNaziv}) — ${p.odDatum.toLocaleDateString("sr-Latn")} → ${p.doDatum.toLocaleDateString("sr-Latn")}`).join("\n");

  // Notifikacija logistici
  await notifyRoles({
    pravnoLiceId: v.pravnoLiceId,
    rolaKodovi: ROLE_LOGISTIKA,
    tip: "VOZILO_NEDOSTUPNO_KAMPANJA" as any,
    poruka: naslov + "\n" + lista,
    linkUrl,
  });

  // Notifikacija agentima prodaje za svaku kampanju
  for (const k of pogodjene) {
    if (!k.vlasnikProdajaId) continue;
    await notify({
      pravnoLiceId: v.pravnoLiceId,
      korisnikId: k.vlasnikProdajaId,
      tip: "VOZILO_NEDOSTUPNO_KAMPANJA" as any,
      poruka: `Vozilo ${sifraTxt} (${noviStatus}) je u tvojoj kampanji "${k.kampanjaNaziv}" (${k.partnerNaziv}). Logistika će predložiti zamenu.`,
      linkUrl: `/logistika/kampanje/${k.kampanjaId}`,
    });
  }

  return { ok: true, pogodjeneCount: pogodjene.length };
}

/**
 * Datum monitoring za radne naloge u korekciji.
 * Vraća listu warning-a; pozivalac (cron job) ih šalje kao notifikacije.
 */
export interface RokWarning {
  tip: "RN" | "STAMPA" | "MONTAZA";
  nalogId: string;
  nalogBroj: string;
  vlasnikProdajaId: string;
  pravnoLiceId: string;
  partnerNaziv: string;
  odDatumKampanje: Date;
  daniDoStarta: number; // negativno ako je kampanja počela
  severnost: "WARNING" | "CRITICAL"; // WARNING < 3 dana, CRITICAL preklapanje
}

export async function checkRokoviKampanja(): Promise<RokWarning[]> {
  const now = new Date();
  const next7 = new Date(now.getTime() + 7 * 86400000);
  const warnings: RokWarning[] = [];

  // Helper: učitaj partner naziv-e za listu partnerId-eva
  async function partnerNazivi(partnerIds: string[]): Promise<Map<string, string>> {
    if (partnerIds.length === 0) return new Map();
    const partners = await prisma.partner.findMany({ where: { id: { in: partnerIds } }, select: { id: true, naziv: true } });
    return new Map(partners.map((p) => [p.id, p.naziv] as const));
  }

  // RN u stanju PRIPREMA_FAJLOVA (korekcija) sa odDatum < +7 dana
  const rnUKorekciji = await prisma.radniNalog.findMany({
    where: {
      pripremaStatus: "KOREKCIJA",
      odDatum: { lte: next7 },
    },
  });
  const partnerNazRn = await partnerNazivi(rnUKorekciji.map((r) => r.partnerId));
  for (const rn of rnUKorekciji) {
    const dani = Math.round((rn.odDatum.getTime() - now.getTime()) / 86400000);
    warnings.push({
      tip: "RN",
      nalogId: rn.id,
      nalogBroj: rn.broj,
      vlasnikProdajaId: rn.vlasnikProdajaId,
      pravnoLiceId: rn.pravnoLiceId,
      partnerNaziv: partnerNazRn.get(rn.partnerId) ?? "—",
      odDatumKampanje: rn.odDatum,
      daniDoStarta: dani,
      severnost: dani <= 0 ? "CRITICAL" : "WARNING",
    });
  }

  // NalogStampu u PROBLEM (korekcija) — proveri rokIzrade vs RN.odDatum
  const stampuPRO = await prisma.nalogStampu.findMany({
    where: { status: "PROBLEM" },
    include: { radniNalog: true },
  });
  const partnerNazSt = await partnerNazivi(stampuPRO.map((n) => n.radniNalog.partnerId));
  for (const n of stampuPRO) {
    const dani = Math.round((n.radniNalog.odDatum.getTime() - now.getTime()) / 86400000);
    if (dani > 7) continue;
    warnings.push({
      tip: "STAMPA",
      nalogId: n.id,
      nalogBroj: n.broj,
      vlasnikProdajaId: n.radniNalog.vlasnikProdajaId,
      pravnoLiceId: n.pravnoLiceId,
      partnerNaziv: partnerNazSt.get(n.radniNalog.partnerId) ?? "—",
      odDatumKampanje: n.radniNalog.odDatum,
      daniDoStarta: dani,
      severnost: dani <= 0 || n.rokIzrade > n.radniNalog.odDatum ? "CRITICAL" : "WARNING",
    });
  }

  // NalogMontazu u PROBLEM
  const montaPRO = await prisma.nalogMontazu.findMany({
    where: { status: "PROBLEM" },
    include: { radniNalog: true },
  });
  const partnerNazMn = await partnerNazivi(montaPRO.map((n) => n.radniNalog.partnerId));
  for (const n of montaPRO) {
    const dani = Math.round((n.radniNalog.odDatum.getTime() - now.getTime()) / 86400000);
    if (dani > 7) continue;
    warnings.push({
      tip: "MONTAZA",
      nalogId: n.id,
      nalogBroj: n.broj,
      vlasnikProdajaId: n.radniNalog.vlasnikProdajaId,
      pravnoLiceId: n.pravnoLiceId,
      partnerNaziv: partnerNazMn.get(n.radniNalog.partnerId) ?? "—",
      odDatumKampanje: n.radniNalog.odDatum,
      daniDoStarta: dani,
      severnost: dani <= 0 ? "CRITICAL" : "WARNING",
    });
  }

  return warnings;
}

export async function sendRokWarnings(warnings: RokWarning[]) {
  for (const w of warnings) {
    const tipLabel = w.tip === "RN" ? "Radni nalog" : w.tip === "STAMPA" ? "Nalog za štampu" : "Nalog za montažu";
    const pathSeg = w.tip === "RN" ? "radni-nalozi" : w.tip === "STAMPA" ? "nalog-stampu" : "nalog-montazu";
    const linkUrl = `/logistika/${pathSeg}/${w.nalogId}`;
    const msg = w.severnost === "CRITICAL"
      ? `🚨 KRITIČNO: ${tipLabel} ${w.nalogBroj} (${w.partnerNaziv}) — popravka je u toku, kampanja je već trebala da počne ${w.odDatumKampanje.toLocaleDateString("sr-Latn")}!`
      : `⚠️ Upozorenje: ${tipLabel} ${w.nalogBroj} (${w.partnerNaziv}) — popravka još traje, kampanja počinje za ${w.daniDoStarta} dana (${w.odDatumKampanje.toLocaleDateString("sr-Latn")}).`;
    await notify({
      pravnoLiceId: w.pravnoLiceId,
      korisnikId: w.vlasnikProdajaId,
      tip: "NALOG_KOREKCIJA" as any,
      poruka: msg,
      linkUrl,
    });
  }
}

/**
 * Workflow notifikacije za RadniNalog (logistika tok).
 * Notifikuje: agenta prodaje (vlasnikProdajaId), logistika role, "Priprema" role.
 *
 * Mapping:
 *   NOVO → PRIHVACEN_LOGISTIKA       — notify prodaja agent
 *   * → PRIPREMA_FAJLOVA              — notify prodaja agent
 *   PRIPREMA_FAJLOVA → KOLORNA_PROBA  — notify Logistika + Priprema
 *   KOLORNA_PROBA → PROBA_ODOBRENA    — notify prodaja agent + Priprema
 *   KOLORNA_PROBA → PRIPREMA_FAJLOVA (korekcija) — notify Priprema
 *   * → STAMPA_U_TOKU                 — notify prodaja agent
 *   * → MONTAZA_U_TOKU                — notify prodaja agent
 *   * → ZAVRSEN                       — notify prodaja agent
 *
 * Email se šalje u zavisnosti od user.email, dok se DB upis dešava uvek.
 */

import { prisma } from "@/lib/prisma";
import { notify, notifyRoles } from "./notify";
import type { NotifikacijaTip, RadniNalogStatus, PripremaStatus } from "@prisma/client";

const ROLE_LOGISTIKA = ["LOGISTICS", "ADMIN", "COUNTRY_MANAGER"];
const ROLE_PRIPREMA = ["LOGISTICS", "ADMIN"]; // priprema fajlova se vodi unutar Logistike

interface RnContext {
  pravnoLiceId: string;
  radniNalogId: string;
  broj: string;
  vlasnikProdajaId: string;
  partnerNaziv?: string;
}

const link = (id: string) => `/logistika/radni-nalozi/${id}`;

export async function notifyRnStatusChange(
  ctx: RnContext,
  fromStatus: RadniNalogStatus | null,
  toStatus: RadniNalogStatus,
) {
  const linkUrl = link(ctx.radniNalogId);
  const klijentTxt = ctx.partnerNaziv ? ` (${ctx.partnerNaziv})` : "";

  switch (toStatus) {
    case "PRIHVACEN_LOGISTIKA":
      await notify({
        pravnoLiceId: ctx.pravnoLiceId,
        korisnikId: ctx.vlasnikProdajaId,
        tip: "RN_PRIHVACEN_LOGISTIKA" as NotifikacijaTip,
        poruka: `Logistika je prihvatila radni nalog ${ctx.broj}${klijentTxt}.`,
        linkUrl,
      });
      break;

    case "PRIPREMA_FAJLOVA":
      // Vraćeno u pripremu (možda nakon korekcije)
      await notify({
        pravnoLiceId: ctx.pravnoLiceId,
        korisnikId: ctx.vlasnikProdajaId,
        tip: "PROBA_KOREKCIJA" as NotifikacijaTip,
        poruka: `Radni nalog ${ctx.broj}${klijentTxt} čeka pripremu / korekciju fajlova.`,
        linkUrl,
      });
      break;

    case "KOLORNA_PROBA":
      // Logistika + Priprema dobijaju poruku da je proba na overu
      await notifyRoles({
        pravnoLiceId: ctx.pravnoLiceId,
        rolaKodovi: ROLE_LOGISTIKA,
        tip: "KOLORNA_PROBA_NA_OVERAVANJU" as NotifikacijaTip,
        poruka: `Kolorna proba za RN ${ctx.broj}${klijentTxt} je na overavanju.`,
        linkUrl,
      });
      break;

    case "PROBA_ODOBRENA":
      await notify({
        pravnoLiceId: ctx.pravnoLiceId,
        korisnikId: ctx.vlasnikProdajaId,
        tip: "PROBA_ODOBRENA" as NotifikacijaTip,
        poruka: `Klijent je odobrio probu za RN ${ctx.broj}${klijentTxt}. Sledeći korak: štampa.`,
        linkUrl,
      });
      await notifyRoles({
        pravnoLiceId: ctx.pravnoLiceId,
        rolaKodovi: ROLE_PRIPREMA,
        tip: "PROBA_ODOBRENA" as NotifikacijaTip,
        poruka: `Proba odobrena za RN ${ctx.broj}${klijentTxt}.`,
        linkUrl,
      });
      break;

    case "STAMPA_U_TOKU":
      await notify({
        pravnoLiceId: ctx.pravnoLiceId,
        korisnikId: ctx.vlasnikProdajaId,
        tip: "STAMPA_GOTOVA" as NotifikacijaTip,
        poruka: `Štampa za RN ${ctx.broj}${klijentTxt} je u toku — rok 72h od predaje.`,
        linkUrl,
      });
      break;

    case "MONTAZA_U_TOKU":
    case "U_REALIZACIJI":
      await notify({
        pravnoLiceId: ctx.pravnoLiceId,
        korisnikId: ctx.vlasnikProdajaId,
        tip: "MONTAZA_ZAVRSENA" as NotifikacijaTip,
        poruka: `Montaža za RN ${ctx.broj}${klijentTxt} je u toku.`,
        linkUrl,
      });
      break;

    case "ZAVRSEN":
      await notify({
        pravnoLiceId: ctx.pravnoLiceId,
        korisnikId: ctx.vlasnikProdajaId,
        tip: "MONTAZA_ZAVRSENA" as NotifikacijaTip,
        poruka: `Radni nalog ${ctx.broj}${klijentTxt} je završen.`,
        linkUrl,
      });
      break;
  }
}

export async function notifyPripremaChange(
  ctx: RnContext,
  toStatus: PripremaStatus,
) {
  const linkUrl = link(ctx.radniNalogId);
  const klijentTxt = ctx.partnerNaziv ? ` (${ctx.partnerNaziv})` : "";

  switch (toStatus) {
    case "POSLATA":
      // Prodaja je poslala fajlove → notify Logistika + Priprema
      await notifyRoles({
        pravnoLiceId: ctx.pravnoLiceId,
        rolaKodovi: ROLE_LOGISTIKA,
        tip: "PRIPREMA_POSLATA" as NotifikacijaTip,
        poruka: `Pripremljeni fajlovi za RN ${ctx.broj}${klijentTxt} su poslati.`,
        linkUrl,
      });
      break;

    case "KOLORNA_PROBA_NA_OVERAVANJU":
      await notifyRoles({
        pravnoLiceId: ctx.pravnoLiceId,
        rolaKodovi: ROLE_LOGISTIKA,
        tip: "KOLORNA_PROBA_NA_OVERAVANJU" as NotifikacijaTip,
        poruka: `Kolorna proba za RN ${ctx.broj}${klijentTxt} stigla iz štamparije.`,
        linkUrl,
      });
      break;

    case "ODOBRENA":
      await notify({
        pravnoLiceId: ctx.pravnoLiceId,
        korisnikId: ctx.vlasnikProdajaId,
        tip: "PROBA_ODOBRENA" as NotifikacijaTip,
        poruka: `Proba odobrena za RN ${ctx.broj}${klijentTxt}.`,
        linkUrl,
      });
      break;

    case "KOREKCIJA":
      await notifyRoles({
        pravnoLiceId: ctx.pravnoLiceId,
        rolaKodovi: ROLE_PRIPREMA,
        tip: "PROBA_KOREKCIJA" as NotifikacijaTip,
        poruka: `Proba za RN ${ctx.broj}${klijentTxt} vraćena je na korekciju.`,
        linkUrl,
      });
      // I prodaja agent dobija obaveštenje
      await notify({
        pravnoLiceId: ctx.pravnoLiceId,
        korisnikId: ctx.vlasnikProdajaId,
        tip: "PROBA_KOREKCIJA" as NotifikacijaTip,
        poruka: `Proba za RN ${ctx.broj}${klijentTxt} je vraćena na korekciju.`,
        linkUrl,
      });
      break;

    case "GOTOVO":
      await notifyRoles({
        pravnoLiceId: ctx.pravnoLiceId,
        rolaKodovi: ROLE_LOGISTIKA,
        tip: "STAMPA_GOTOVA" as NotifikacijaTip,
        poruka: `Priprema gotova za RN ${ctx.broj}${klijentTxt} — može u štampu.`,
        linkUrl,
      });
      break;
  }
}

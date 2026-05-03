/**
 * Notifikacije za korekciju naloga (RN, štampa, montaža).
 * Šalje email + DB notifikaciju odgovarajućem primaocu po tipu naloga:
 * - RadniNalog: vlasnik prodaje (vlasnikProdajaId) — agent koji je otvorio
 * - NalogStampu: stamparijaEmail (ako postoji) ili logistika kao fallback
 * - NalogMontazu: Montazer.email ili logistika kao fallback
 */

import { prisma } from "@/lib/prisma";
import { notify } from "./notify";
import { sendEmail } from "./email";

const APP_URL = process.env.NEXTAUTH_URL ?? "https://img-crm-platform.vercel.app";
const ROLE_LOGISTIKA = ["LOGISTICS", "ADMIN", "COUNTRY_MANAGER"];

function emailHtml(opts: { naslov: string; nalogBroj: string; razlog: string; link: string }) {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 20px;">
      <div style="background: #C70028; color: white; padding: 12px 16px; font-weight: bold;">IMG CRM — Popravka</div>
      <div style="background: white; border: 1px solid #e5e7eb; padding: 20px;">
        <h2 style="margin: 0 0 10px; font-size: 16px; color: #C70028;">⚠️ ${opts.naslov}</h2>
        <p style="margin: 0 0 8px;"><strong>Nalog:</strong> ${opts.nalogBroj}</p>
        <p style="margin: 0 0 16px;"><strong>Razlog:</strong> ${opts.razlog}</p>
        <a href="${opts.link}" style="display: inline-block; background: #C70028; color: white; padding: 10px 16px; text-decoration: none; border-radius: 4px;">Otvori nalog</a>
      </div>
      <p style="font-size: 11px; color: #9ca3af; text-align: center; margin-top: 20px;">
        Info Media Group · Generisano: ${new Date().toLocaleString("sr-Latn")}
      </p>
    </div>`;
}

export async function notifyKorekcijaRadniNalog(rnId: string, razlog: string) {
  const rn = await prisma.radniNalog.findUnique({ where: { id: rnId } });
  if (!rn) return;
  const partner = await prisma.partner.findUnique({ where: { id: rn.partnerId } });
  const linkUrl = `/logistika/radni-nalozi/${rn.id}`;
  const fullLink = `${APP_URL}${linkUrl}`;
  // DB notifikacija
  await notify({
    pravnoLiceId: rn.pravnoLiceId,
    korisnikId: rn.vlasnikProdajaId,
    tip: "NALOG_KOREKCIJA" as any,
    poruka: `Popravka tražena na RN ${rn.broj}${partner ? ` (${partner.naziv})` : ""}. Razlog: ${razlog}`,
    linkUrl,
  });
  // Email — notify već šalje email userima, ovde dodaje detaljniji sa razlogom
  const agent = await prisma.korisnik.findUnique({ where: { id: rn.vlasnikProdajaId } });
  if (agent?.email) {
    await sendEmail({
      to: agent.email,
      subject: `[IMG CRM] Popravka — RN ${rn.broj}`,
      html: emailHtml({
        naslov: "Popravka traženo — Radni nalog",
        nalogBroj: `${rn.broj}${partner ? ` (${partner.naziv})` : ""}`,
        razlog,
        link: fullLink,
      }),
    });
  }
}

export async function notifyKorekcijaNalogStampu(nalogId: string, razlog: string) {
  const n = await prisma.nalogStampu.findUnique({
    where: { id: nalogId },
    include: { radniNalog: true },
  });
  if (!n) return;
  const linkUrl = `/logistika/nalog-stampu/${n.id}`;
  const fullLink = `${APP_URL}${linkUrl}`;
  // DB notifikacija logistici
  for (const rola of ROLE_LOGISTIKA) {
    const users = await prisma.korisnik.findMany({
      where: { deletedAt: null, aktivan: true, roles: { some: { pravnoLiceId: n.pravnoLiceId, rola: { kod: rola as any } } } },
    });
    for (const u of users) {
      await notify({
        pravnoLiceId: n.pravnoLiceId,
        korisnikId: u.id,
        tip: "NALOG_KOREKCIJA" as any,
        poruka: `Popravka — Nalog za štampu ${n.broj}. Razlog: ${razlog}`,
        linkUrl,
        email: false, // izbegavamo dupli email; šaljemo samo direktnoj adresi
      });
    }
  }
  // Email štampariji
  if (n.stamparijaEmail) {
    await sendEmail({
      to: n.stamparijaEmail,
      subject: `[IMG] Popravka — ${n.broj} (${n.stamparija})`,
      html: emailHtml({
        naslov: "Popravka traženo — Nalog za štampu",
        nalogBroj: n.broj,
        razlog,
        link: fullLink,
      }),
    });
  }
}

export async function notifyKorekcijaNalogMontazu(nalogId: string, razlog: string) {
  const n = await prisma.nalogMontazu.findUnique({
    where: { id: nalogId },
    include: { montazerRef: true, radniNalog: true },
  });
  if (!n) return;
  const linkUrl = `/logistika/nalog-montazu/${n.id}`;
  const fullLink = `${APP_URL}${linkUrl}`;

  // DB notifikacija logistici
  for (const rola of ROLE_LOGISTIKA) {
    const users = await prisma.korisnik.findMany({
      where: { deletedAt: null, aktivan: true, roles: { some: { pravnoLiceId: n.pravnoLiceId, rola: { kod: rola as any } } } },
    });
    for (const u of users) {
      await notify({
        pravnoLiceId: n.pravnoLiceId,
        korisnikId: u.id,
        tip: "NALOG_KOREKCIJA" as any,
        poruka: `Popravka — Nalog za montažu ${n.broj}. Razlog: ${razlog}`,
        linkUrl,
        email: false,
      });
    }
  }
  // Email montažeru
  if (n.montazerRef?.email) {
    await sendEmail({
      to: n.montazerRef.email,
      subject: `[IMG] Popravka — ${n.broj} (montaža)`,
      html: emailHtml({
        naslov: "Popravka traženo — Nalog za montažu",
        nalogBroj: n.broj,
        razlog,
        link: fullLink,
      }),
    });
  }
}

export async function notifyKorekcijaOdobrena(tip: "RN" | "STAMPA" | "MONTAZA", id: string) {
  // Notifikuj prodaju i/ili logistiku da je popravka odobrena
  if (tip === "RN") {
    const rn = await prisma.radniNalog.findUnique({ where: { id } });
    if (!rn) return;
    await notify({
      pravnoLiceId: rn.pravnoLiceId,
      korisnikId: rn.vlasnikProdajaId,
      tip: "NALOG_KOREKCIJA_ODOBRENA" as any,
      poruka: `Popravka odobrena — RN ${rn.broj} može dalje.`,
      linkUrl: `/logistika/radni-nalozi/${rn.id}`,
    });
  } else if (tip === "STAMPA") {
    const n = await prisma.nalogStampu.findUnique({ where: { id }, include: { radniNalog: true } });
    if (!n) return;
    // Notify prodaja iz povezanog RN-a
    await notify({
      pravnoLiceId: n.pravnoLiceId,
      korisnikId: n.radniNalog.vlasnikProdajaId,
      tip: "NALOG_KOREKCIJA_ODOBRENA" as any,
      poruka: `Popravka odobrena — Nalog za štampu ${n.broj}.`,
      linkUrl: `/logistika/nalog-stampu/${n.id}`,
    });
  } else if (tip === "MONTAZA") {
    const n = await prisma.nalogMontazu.findUnique({ where: { id }, include: { radniNalog: true } });
    if (!n) return;
    await notify({
      pravnoLiceId: n.pravnoLiceId,
      korisnikId: n.radniNalog.vlasnikProdajaId,
      tip: "NALOG_KOREKCIJA_ODOBRENA" as any,
      poruka: `Popravka odobrena — Nalog za montažu ${n.broj}.`,
      linkUrl: `/logistika/nalog-montazu/${n.id}`,
    });
  }
}

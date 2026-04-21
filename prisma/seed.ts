/* eslint-disable no-console */
import {
  PrismaClient,
  RolaKod,
  AkcijaDozvole,
  StageKod,
  LostReasonKod,
  PartnerTip,
  Segment,
  VoziloTip,
  PozicijaTip,
  DokumentTip,
  KampanjaStatus,
  RezervacijaStatus,
  OppIzvor,
  AktivnostTip,
  LegalBasis,
} from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

const DEV_PASSWORD = "Passw0rd!";

const PERMISSION_MATRIX: Record<RolaKod, Array<[string, AkcijaDozvole[]]>> = {
  ADMIN: [
    ["partners", ["READ", "CREATE", "UPDATE", "DELETE", "EXPORT", "APPROVE"]],
    ["contacts", ["READ", "CREATE", "UPDATE", "DELETE", "EXPORT", "APPROVE"]],
    ["activities", ["READ", "CREATE", "UPDATE", "DELETE"]],
    ["opportunities", ["READ", "CREATE", "UPDATE", "DELETE", "EXPORT", "APPROVE"]],
    ["pipeline", ["READ", "EXPORT"]],
    ["campaigns", ["READ", "CREATE", "UPDATE", "DELETE", "EXPORT"]],
    ["vehicles", ["READ", "CREATE", "UPDATE", "DELETE", "EXPORT"]],
    ["positions", ["READ", "CREATE", "UPDATE", "DELETE"]],
    ["mediabook", ["READ", "APPROVE"]],
    ["invoices", ["READ", "CREATE", "UPDATE", "DELETE", "EXPORT", "APPROVE"]],
    ["handoff", ["READ", "CREATE", "EXPORT", "APPROVE"]],
    ["reports", ["READ", "EXPORT"]],
    ["dashboard", ["READ"]],
    ["users", ["READ", "CREATE", "UPDATE", "DELETE"]],
    ["roles", ["READ", "CREATE", "UPDATE", "DELETE"]],
    ["audit_log", ["READ", "EXPORT"]],
    ["gdpr_operations", ["READ", "CREATE", "UPDATE", "EXPORT", "APPROVE"]],
    ["system_settings", ["READ", "CREATE", "UPDATE", "DELETE"]],
  ],
  COUNTRY_MANAGER: [
    ["partners", ["READ", "CREATE", "UPDATE", "DELETE", "EXPORT"]],
    ["contacts", ["READ", "CREATE", "UPDATE", "DELETE", "EXPORT"]],
    ["activities", ["READ", "CREATE", "UPDATE", "DELETE"]],
    ["opportunities", ["READ", "CREATE", "UPDATE", "DELETE", "EXPORT"]],
    ["pipeline", ["READ", "EXPORT"]],
    ["campaigns", ["READ", "CREATE", "UPDATE", "DELETE", "EXPORT"]],
    ["vehicles", ["READ", "CREATE", "UPDATE", "DELETE", "EXPORT"]],
    ["positions", ["READ", "CREATE", "UPDATE", "DELETE"]],
    ["mediabook", ["READ", "APPROVE"]],
    ["invoices", ["READ", "EXPORT"]],
    ["handoff", ["READ", "EXPORT"]],
    ["reports", ["READ", "EXPORT"]],
    ["dashboard", ["READ"]],
    ["users", ["READ"]],
    ["audit_log", ["READ"]],
  ],
  SALES_MANAGER: [
    ["partners", ["READ", "CREATE", "UPDATE", "EXPORT"]],
    ["contacts", ["READ", "CREATE", "UPDATE", "EXPORT"]],
    ["activities", ["READ", "CREATE", "UPDATE", "DELETE"]],
    ["opportunities", ["READ", "CREATE", "UPDATE", "EXPORT", "APPROVE"]],
    ["pipeline", ["READ", "EXPORT"]],
    ["campaigns", ["READ", "UPDATE"]],
    ["mediabook", ["READ", "APPROVE"]],
    ["invoices", ["READ"]],
    ["reports", ["READ", "EXPORT"]],
    ["dashboard", ["READ"]],
    ["users", ["READ"]],
  ],
  SALES_REP: [
    ["partners", ["READ", "CREATE", "UPDATE"]],
    ["contacts", ["READ", "CREATE", "UPDATE"]],
    ["activities", ["READ", "CREATE", "UPDATE"]],
    ["opportunities", ["READ", "CREATE", "UPDATE"]],
    ["pipeline", ["READ"]],
    ["campaigns", ["READ"]],
    ["vehicles", ["READ"]],
    ["positions", ["READ"]],
    ["mediabook", ["READ", "APPROVE"]],
    ["invoices", ["READ"]],
    ["reports", ["READ"]],
    ["dashboard", ["READ"]],
  ],
  FINANCE: [
    ["partners", ["READ"]],
    ["contacts", ["READ"]],
    ["activities", ["READ"]],
    ["opportunities", ["READ"]],
    ["pipeline", ["READ"]],
    ["campaigns", ["READ", "EXPORT"]],
    ["vehicles", ["READ"]],
    ["invoices", ["READ", "CREATE", "UPDATE", "DELETE", "EXPORT", "APPROVE"]],
    ["handoff", ["READ", "CREATE", "UPDATE", "EXPORT", "APPROVE"]],
    ["reports", ["READ", "EXPORT"]],
    ["dashboard", ["READ"]],
    ["audit_log", ["READ"]],
  ],
  READ_ONLY: [
    ["partners", ["READ"]],
    ["contacts", ["READ"]],
    ["activities", ["READ"]],
    ["opportunities", ["READ"]],
    ["pipeline", ["READ"]],
    ["campaigns", ["READ"]],
    ["vehicles", ["READ"]],
    ["positions", ["READ"]],
    ["mediabook", ["READ"]],
    ["invoices", ["READ"]],
    ["reports", ["READ", "EXPORT"]],
    ["dashboard", ["READ"]],
  ],
};

async function seedPravnaLica() {
  const data = [
    { kod: "MNE", naziv: "IMG MNE d.o.o.", zemlja: "ME", valuta: "EUR", pib: "12345678", tz: "Europe/Podgorica", jezik: "cnr", stopaPdv: "21" },
    { kod: "SRB", naziv: "IMG SRB d.o.o.", zemlja: "RS", valuta: "RSD", pib: "23456789", tz: "Europe/Belgrade", jezik: "sr-Latn", stopaPdv: "20" },
    { kod: "HRV", naziv: "IMG HRV d.o.o.", zemlja: "HR", valuta: "EUR", pib: "34567890", tz: "Europe/Zagreb", jezik: "hr", stopaPdv: "25" },
    { kod: "BIH", naziv: "IMG BIH d.o.o.", zemlja: "BA", valuta: "BAM", pib: "45678901", tz: "Europe/Sarajevo", jezik: "bs", stopaPdv: "17" },
  ];
  for (const pl of data) {
    await prisma.pravnoLice.upsert({
      where: { kod: pl.kod },
      update: { ...pl },
      create: { ...pl },
    });
  }
  return prisma.pravnoLice.findMany();
}

async function seedRoleAndPermissions() {
  const roleDefs: Array<{ kod: RolaKod; naziv: string }> = [
    { kod: "ADMIN", naziv: "Administrator" },
    { kod: "COUNTRY_MANAGER", naziv: "Country Manager" },
    { kod: "SALES_MANAGER", naziv: "Sales Manager" },
    { kod: "SALES_REP", naziv: "Sales Rep" },
    { kod: "FINANCE", naziv: "Finance" },
    { kod: "READ_ONLY", naziv: "Read-only (Direktor/odbor)" },
  ];
  for (const r of roleDefs) {
    await prisma.rola.upsert({
      where: { kod: r.kod },
      update: { naziv: r.naziv },
      create: { kod: r.kod, naziv: r.naziv },
    });
  }
  const roles = await prisma.rola.findMany();
  for (const rola of roles) {
    const matrix = PERMISSION_MATRIX[rola.kod];
    for (const [modul, akcije] of matrix) {
      for (const akcija of akcije) {
        await prisma.dozvola.upsert({
          where: { rolaId_modul_akcija: { rolaId: rola.id, modul, akcija } },
          update: {},
          create: { rolaId: rola.id, modul, akcija },
        });
      }
    }
  }
  return roles;
}

async function seedStages() {
  const stages: Array<{ kod: StageKod; naziv: string; defaultProbability: number; redosled: number }> = [
    { kod: "NEW", naziv: "New", defaultProbability: 10, redosled: 1 },
    { kod: "QUALIFIED", naziv: "Qualified", defaultProbability: 25, redosled: 2 },
    { kod: "PROPOSAL_SENT", naziv: "Proposal Sent", defaultProbability: 40, redosled: 3 },
    { kod: "NEGOTIATION", naziv: "Negotiation", defaultProbability: 60, redosled: 4 },
    { kod: "VERBALLY_CONFIRMED", naziv: "Verbally Confirmed", defaultProbability: 80, redosled: 5 },
    { kod: "WON", naziv: "Won", defaultProbability: 100, redosled: 6 },
    { kod: "LOST", naziv: "Lost", defaultProbability: 0, redosled: 7 },
  ];
  for (const s of stages) {
    await prisma.stage.upsert({
      where: { kod: s.kod },
      update: s,
      create: s,
    });
  }
  return prisma.stage.findMany();
}

async function seedLostReasons() {
  const reasons: Array<{ kod: LostReasonKod; naziv: string }> = [
    { kod: "CENA", naziv: "Cena" },
    { kod: "KONKURENCIJA", naziv: "Konkurencija" },
    { kod: "TIMING", naziv: "Timing" },
    { kod: "BEZ_ODLUKE", naziv: "Bez odluke" },
    { kod: "DUPLIKAT", naziv: "Duplikat" },
    { kod: "OSTALO", naziv: "Ostalo (slobodan tekst)" },
  ];
  for (const r of reasons) {
    await prisma.lostReason.upsert({
      where: { kod: r.kod },
      update: r,
      create: r,
    });
  }
}

async function seedUsers(pravnaLica: Awaited<ReturnType<typeof seedPravnaLica>>, roles: Awaited<ReturnType<typeof seedRoleAndPermissions>>) {
  const hash = await argon2.hash(DEV_PASSWORD);
  const rolaByKod = Object.fromEntries(roles.map((r) => [r.kod, r])) as Record<RolaKod, (typeof roles)[number]>;
  const plByKod = Object.fromEntries(pravnaLica.map((p) => [p.kod, p]));

  const users = [
    { email: "admin@img.test", ime: "Ana", prezime: "Admin", role: RolaKod.ADMIN, pl: "MNE", twoFa: true },
    { email: "rep.mne@img.test", ime: "Marko", prezime: "Petrović", role: RolaKod.SALES_REP, pl: "MNE", twoFa: false },
    { email: "manager.mne@img.test", ime: "Jovana", prezime: "Jovanović", role: RolaKod.SALES_MANAGER, pl: "MNE", twoFa: false },
    { email: "country.mne@img.test", ime: "Nikola", prezime: "Nikolić", role: RolaKod.COUNTRY_MANAGER, pl: "MNE", twoFa: true },
    { email: "finance.mne@img.test", ime: "Tamara", prezime: "Finansić", role: RolaKod.FINANCE, pl: "MNE", twoFa: true },
    { email: "rep.srb@img.test", ime: "Stefan", prezime: "Stanković", role: RolaKod.SALES_REP, pl: "SRB", twoFa: false },
    { email: "country.srb@img.test", ime: "Milica", prezime: "Mitić", role: RolaKod.COUNTRY_MANAGER, pl: "SRB", twoFa: true },
    { email: "readonly@img.test", ime: "Radmila", prezime: "Readonly", role: RolaKod.READ_ONLY, pl: "MNE", twoFa: false },
  ];
  const created = [];
  for (const u of users) {
    const korisnik = await prisma.korisnik.upsert({
      where: { email: u.email },
      update: { ime: u.ime, prezime: u.prezime },
      create: {
        email: u.email,
        passwordHash: hash,
        ime: u.ime,
        prezime: u.prezime,
        twoFaEnabled: u.twoFa,
      },
    });
    await prisma.korisnikRola.upsert({
      where: {
        korisnikId_rolaId_pravnoLiceId: {
          korisnikId: korisnik.id,
          rolaId: rolaByKod[u.role].id,
          pravnoLiceId: plByKod[u.pl].id,
        },
      },
      update: {},
      create: {
        korisnikId: korisnik.id,
        rolaId: rolaByKod[u.role].id,
        pravnoLiceId: plByKod[u.pl].id,
      },
    });
    created.push(korisnik);
  }
  return created;
}

async function seedPartnersAndContacts(pravnaLica: Awaited<ReturnType<typeof seedPravnaLica>>, users: Awaited<ReturnType<typeof seedUsers>>) {
  const plByKod = Object.fromEntries(pravnaLica.map((p) => [p.kod, p]));
  const rep = users.find((u) => u.email === "rep.mne@img.test")!;
  const repSrb = users.find((u) => u.email === "rep.srb@img.test")!;

  const samplePartners = [
    ...seedCountryPartners("MNE", plByKod.MNE.id, rep.id, 10),
    ...seedCountryPartners("SRB", plByKod.SRB.id, repSrb.id, 10),
    ...seedCountryPartners("HRV", plByKod.HRV.id, rep.id, 5),
    ...seedCountryPartners("BIH", plByKod.BIH.id, rep.id, 5),
  ];

  const partneri = [];
  for (const p of samplePartners) {
    const existing = await prisma.partner.findFirst({ where: { pravnoLiceId: p.pravnoLiceId, naziv: p.naziv } });
    const partner = existing
      ? await prisma.partner.update({ where: { id: existing.id }, data: p })
      : await prisma.partner.create({ data: p });
    partneri.push(partner);

    // 2 kontakta po partneru
    const emails = [`${slug(p.naziv)}-primary@example.test`, `${slug(p.naziv)}-secondary@example.test`];
    for (let i = 0; i < 2; i++) {
      await prisma.kontakt.upsert({
        where: { id: `${partner.id}-k${i}` }, // neće postojati, forsira create
        update: {},
        create: {
          id: `${partner.id}-k${i}`,
          partnerId: partner.id,
          ime: i === 0 ? "Aleksa Primarni" : "Bojana Sekundarna",
          pozicija: i === 0 ? "CMO" : "Marketing specialist",
          email: emails[i],
          telefon: `+382-${60 + i}-${Math.floor(100000 + Math.random() * 899999)}`,
          primarni: i === 0,
          legalBasis: LegalBasis.LEGITIMATE_INTEREST,
          izvor: "seed",
        },
      }).catch(async () => {
        // ako već postoji (npr. id sudar), preskoči
      });
    }
  }
  return partneri;
}

function seedCountryPartners(kod: string, pravnoLiceId: string, vlasnikId: string, n: number) {
  const tipovi: PartnerTip[] = ["DIRECT", "AGENCY", "RESELLER", "PROVIDER"];
  const segmenti: Segment[] = ["A", "B", "C"];
  const gradovi: Record<string, string[]> = {
    MNE: ["Podgorica", "Nikšić", "Budva", "Bar"],
    SRB: ["Beograd", "Novi Sad", "Niš", "Kragujevac"],
    HRV: ["Zagreb", "Split", "Rijeka", "Osijek"],
    BIH: ["Sarajevo", "Banja Luka", "Mostar", "Tuzla"],
  };
  return Array.from({ length: n }, (_, i) => ({
    pravnoLiceId,
    naziv: `${kod} Partner ${i + 1}`,
    tip: tipovi[i % tipovi.length],
    segment: segmenti[i % segmenti.length],
    maticniBroj: `${kod}${100000 + i}`,
    pibVat: `${kod}VAT${100000 + i}`,
    zemlja: kod === "MNE" ? "ME" : kod === "SRB" ? "RS" : kod === "HRV" ? "HR" : "BA",
    grad: gradovi[kod][i % 4],
    vlasnikId,
  }));
}

async function seedVehiclesAndPositions(pravnaLica: Awaited<ReturnType<typeof seedPravnaLica>>) {
  const plByKod = Object.fromEntries(pravnaLica.map((p) => [p.kod, p]));
  const vozila = [];
  let idx = 0;
  for (const kod of ["MNE", "SRB", "HRV", "BIH"]) {
    for (let v = 0; v < 5; v++) {
      idx++;
      const reg = `${kod}-${1000 + idx}`;
      const vozilo = await prisma.vozilo.upsert({
        where: { pravnoLiceId_registracija: { pravnoLiceId: plByKod[kod].id, registracija: reg } },
        update: {},
        create: {
          pravnoLiceId: plByKod[kod].id,
          registracija: reg,
          tip: v % 2 === 0 ? "BUS" : "MINI",
          zemlja: kod === "MNE" ? "ME" : kod === "SRB" ? "RS" : kod === "HRV" ? "HR" : "BA",
          grad: kod === "MNE" ? "Podgorica" : kod === "SRB" ? "Beograd" : kod === "HRV" ? "Zagreb" : "Sarajevo",
        },
      });
      vozila.push(vozilo);
      const pozicijeTipovi: PozicijaTip[] = ["CELO_VOZILO", "ZADNJI_DEO", "BOK_LEVO", "BOK_DESNO"];
      for (const t of pozicijeTipovi) {
        const exists = await prisma.pozicija.findFirst({ where: { voziloId: vozilo.id, tip: t } });
        if (!exists) {
          await prisma.pozicija.create({
            data: {
              voziloId: vozilo.id,
              tip: t,
              dimenzije: t === "CELO_VOZILO" ? "12m x 3m" : "2m x 1m",
              cenaPoPeriodu: t === "CELO_VOZILO" ? "2500" : "400",
              valuta: plByKod[kod].valuta,
              minPeriodDana: 14,
            },
          });
        }
      }
    }
  }
  return vozila;
}

async function seedOpportunities(
  pravnaLica: Awaited<ReturnType<typeof seedPravnaLica>>,
  users: Awaited<ReturnType<typeof seedUsers>>,
  partneri: Awaited<ReturnType<typeof seedPartnersAndContacts>>,
) {
  const stages = await prisma.stage.findMany();
  const stageByKod = Object.fromEntries(stages.map((s) => [s.kod, s]));
  const rep = users.find((u) => u.email === "rep.mne@img.test")!;
  const repSrb = users.find((u) => u.email === "rep.srb@img.test")!;

  const spread: StageKod[] = [
    "NEW", "NEW", "NEW", "NEW",
    "QUALIFIED", "QUALIFIED", "QUALIFIED",
    "PROPOSAL_SENT", "PROPOSAL_SENT", "PROPOSAL_SENT",
    "NEGOTIATION", "NEGOTIATION",
    "VERBALLY_CONFIRMED",
    "WON", "WON",
    "LOST",
  ];

  let created = 0;
  for (let i = 0; i < 50; i++) {
    const partner = partneri[i % partneri.length];
    const stageKod = spread[i % spread.length];
    const stage = stageByKod[stageKod];
    const vlasnik = partner.pravnoLiceId === pravnaLica.find((p) => p.kod === "SRB")!.id ? repSrb : rep;
    await prisma.opportunity.create({
      data: {
        pravnoLiceId: partner.pravnoLiceId,
        naziv: `Kampanja ${partner.naziv} ${i + 1}`,
        partnerId: partner.id,
        vlasnikId: vlasnik.id,
        stageId: stage.id,
        probability: stage.defaultProbability,
        izvor: (["INBOUND", "OUTBOUND", "REFERRAL", "EXISTING_CLIENT", "AGENCY"] as OppIzvor[])[i % 5],
        valuta: pravnaLica.find((p) => p.id === partner.pravnoLiceId)!.valuta,
        expValue: String(2000 + (i % 10) * 1500),
        expCloseDate: new Date(Date.now() + (10 + i) * 24 * 60 * 60 * 1000),
        tags: [],
      },
    });
    created++;
  }
  return created;
}

async function seedActivitiesAndCampaigns(users: Awaited<ReturnType<typeof seedUsers>>) {
  const opps = await prisma.opportunity.findMany({ take: 15 });
  const rep = users.find((u) => u.email === "rep.mne@img.test")!;
  for (const opp of opps) {
    await prisma.aktivnost.create({
      data: {
        opportunityId: opp.id,
        partnerId: opp.partnerId,
        autorId: rep.id,
        tip: AktivnostTip.POZIV,
        datum: new Date(),
        opis: "Inicijalni poziv, dogovoren follow-up.",
        ishod: "Pozitivno",
      },
    });
  }

  // 15 potvrđenih kampanja iz Won oportuniteta — kreiraj placeholder Won
  const wonStage = await prisma.stage.findUnique({ where: { kod: "WON" } });
  const wonOpps = await prisma.opportunity.findMany({ where: { stageId: wonStage!.id }, take: 15, include: { partner: true } });
  for (const opp of wonOpps) {
    const exists = await prisma.kampanja.findUnique({ where: { opportunityId: opp.id } });
    if (!exists) {
      await prisma.kampanja.create({
        data: {
          opportunityId: opp.id,
          pravnoLiceId: opp.pravnoLiceId,
          partnerId: opp.partnerId,
          naziv: `Kampanja ${opp.naziv}`,
          odDatum: new Date(),
          doDatum: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: KampanjaStatus.POTVRDENA,
          valuta: opp.valuta,
        },
      });
    }
  }
}

async function seedInvoices(pravnaLica: Awaited<ReturnType<typeof seedPravnaLica>>) {
  const pl = pravnaLica.find((p) => p.kod === "MNE")!;
  const kampanje = await prisma.kampanja.findMany({ where: { pravnoLiceId: pl.id }, take: 10 });
  for (let i = 0; i < kampanje.length; i++) {
    const k = kampanje[i];
    const podzbir = 1000 + i * 150;
    const pdv = Math.round(podzbir * 0.21 * 100) / 100;
    const ukupno = podzbir + pdv;
    await prisma.dokument.upsert({
      where: { pravnoLiceId_tip_broj: { pravnoLiceId: pl.id, tip: DokumentTip.PREDRACUN, broj: `PRE-MNE-2026-${String(i + 1).padStart(6, "0")}` } },
      update: {},
      create: {
        pravnoLiceId: pl.id,
        tip: DokumentTip.PREDRACUN,
        broj: `PRE-MNE-2026-${String(i + 1).padStart(6, "0")}`,
        datum: new Date(),
        partnerId: k.partnerId,
        kampanjaId: k.id,
        podzbir: String(podzbir),
        pdv: String(pdv),
        ukupno: String(ukupno),
        valuta: pl.valuta,
        stavke: {
          create: [
            {
              opis: `Zakup oglasnog prostora – kampanja ${k.naziv}`,
              kolicina: "1",
              jedinicnaCena: String(podzbir),
              iznos: String(podzbir),
            },
          ],
        },
      },
    });
  }
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function main() {
  console.log("▶ Seed: pravna lica");
  const pravnaLica = await seedPravnaLica();
  console.log("▶ Seed: role i dozvole");
  const roles = await seedRoleAndPermissions();
  console.log("▶ Seed: stages");
  await seedStages();
  console.log("▶ Seed: lost reasons");
  await seedLostReasons();
  console.log("▶ Seed: korisnici");
  const users = await seedUsers(pravnaLica, roles);
  console.log("▶ Seed: partneri & kontakti");
  const partneri = await seedPartnersAndContacts(pravnaLica, users);
  console.log("▶ Seed: vozila & pozicije");
  await seedVehiclesAndPositions(pravnaLica);
  console.log("▶ Seed: opportunities");
  const oppCount = await seedOpportunities(pravnaLica, users, partneri);
  console.log(`  • ${oppCount} opportunity-ja`);
  console.log("▶ Seed: aktivnosti & kampanje");
  await seedActivitiesAndCampaigns(users);
  console.log("▶ Seed: predračuni");
  await seedInvoices(pravnaLica);
  console.log("✓ Seed gotov.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

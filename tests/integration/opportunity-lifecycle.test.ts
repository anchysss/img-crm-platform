import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

describe("opportunity lifecycle hold/release (integration)", () => {
  let plId: string;
  let partnerId: string;
  let vlasnikId: string;
  let pozicijaId: string;
  let testOppId: string;

  beforeAll(async () => {
    const pl = await prisma.pravnoLice.findFirstOrThrow({ where: { kod: "MNE" } });
    plId = pl.id;
    const p = await prisma.partner.findFirstOrThrow({ where: { pravnoLiceId: plId } });
    partnerId = p.id;
    const u = await prisma.korisnik.findFirstOrThrow({ where: { email: "rep.mne@img.test" } });
    vlasnikId = u.id;
    const voz = await prisma.vozilo.findFirstOrThrow({ where: { pravnoLiceId: plId }, include: { pozicije: true } });
    pozicijaId = voz.pozicije[0].id;
  });

  afterAll(async () => {
    if (testOppId) {
      await prisma.rezervacija.deleteMany({ where: { opportunityId: testOppId } });
      await prisma.opportunity.deleteMany({ where: { id: testOppId } });
    }
    await prisma.$disconnect();
  });

  it("HOLD on Opportunity gets CONFIRMED on WON, RELEASED on LOST", async () => {
    const stageNew = await prisma.stage.findUniqueOrThrow({ where: { kod: "NEW" } });
    const stageWon = await prisma.stage.findUniqueOrThrow({ where: { kod: "WON" } });
    const stageLost = await prisma.stage.findUniqueOrThrow({ where: { kod: "LOST" } });

    const opp = await prisma.opportunity.create({
      data: {
        pravnoLiceId: plId,
        naziv: "Integration test opp",
        partnerId,
        vlasnikId,
        stageId: stageNew.id,
        probability: 10,
        izvor: "OUTBOUND",
        valuta: "EUR",
        expValue: "1000",
        expCloseDate: new Date(Date.now() + 30 * 86400000),
        tags: [],
      },
    });
    testOppId = opp.id;

    const rez = await prisma.rezervacija.create({
      data: {
        pozicijaId,
        opportunityId: opp.id,
        status: "HOLD",
        odDatum: new Date(),
        doDatum: new Date(Date.now() + 14 * 86400000),
      },
    });

    // Simuliraj WON: HOLD → CONFIRMED
    await prisma.opportunity.update({ where: { id: opp.id }, data: { stageId: stageWon.id } });
    await prisma.rezervacija.updateMany({
      where: { opportunityId: opp.id, status: "HOLD" },
      data: { status: "CONFIRMED" },
    });
    const confirmedRez = await prisma.rezervacija.findUniqueOrThrow({ where: { id: rez.id } });
    expect(confirmedRez.status).toBe("CONFIRMED");

    // Simuliraj LOST na drugoj rezervaciji: HOLD → RELEASED
    const rez2 = await prisma.rezervacija.create({
      data: {
        pozicijaId,
        opportunityId: opp.id,
        status: "HOLD",
        odDatum: new Date(Date.now() + 60 * 86400000),
        doDatum: new Date(Date.now() + 74 * 86400000),
      },
    });
    await prisma.opportunity.update({ where: { id: opp.id }, data: { stageId: stageLost.id } });
    await prisma.rezervacija.updateMany({
      where: { opportunityId: opp.id, status: "HOLD" },
      data: { status: "RELEASED" },
    });
    const releasedRez = await prisma.rezervacija.findUniqueOrThrow({ where: { id: rez2.id } });
    expect(releasedRez.status).toBe("RELEASED");
  });
});

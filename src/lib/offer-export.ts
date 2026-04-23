/**
 * Klijentski XLSX export za ponudu (offer).
 * Generiše XLSX u IMG formatu (prema postojećim P*.xlsx primerima).
 */
import type { RouterOutputs } from "./trpc-client-types";

interface OfferStavka {
  rb: number;
  opis: string;
  grad: string;
  brojVozila: number;
  cena: number;
  popustPct: number;
  cenaSaPopustom: number;
}

interface OfferParams {
  brojPonude: string;
  datum: Date;
  poddeonica: string; // npr "OUTDOOR - VOŽNJA NA ODABRANOJ RUTI / TOTAL DESIGN"
  klijent: string;
  klijentAdresa?: string;
  agencija?: string;
  kampanjaNaziv: string;
  period: string;
  grad: string;
  brojVozila: number;
  vaziDo: Date;
  sastavio: string;
  sastavioEmail?: string;
  sastavioTel?: string;
  pravnoLiceNaziv: string;
  pravnoLiceAdresa: string;
  pravnoLiceTel?: string;
  pravnoLiceEmail?: string;
  stavke: OfferStavka[];
  ukupnoZaProdukciju?: number;
  napomena?: string;
  valuta: string;
  stopaPdv: number;
}

export async function downloadOfferXlsx(filename: string, p: OfferParams) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = p.pravnoLiceNaziv;
  wb.created = new Date();
  const ws = wb.addWorksheet("Ponuda");
  ws.columns = [
    { width: 4 },  // Rb
    { width: 38 }, // Opis
    { width: 14 }, // Grad
    { width: 10 }, // Broj vozila
    { width: 12 }, // Cena
    { width: 8 },  // Popust %
    { width: 12 }, // Cena sa popustom
    { width: 12 }, // Popust €
    { width: 14 }, // Ukupno
  ];

  // Header block
  ws.mergeCells("A1:I1"); ws.getCell("A1").value = p.pravnoLiceNaziv; ws.getCell("A1").font = { bold: true, size: 14 };
  ws.mergeCells("A2:I2"); ws.getCell("A2").value = p.pravnoLiceAdresa;
  if (p.pravnoLiceTel) { ws.mergeCells("A3:I3"); ws.getCell("A3").value = p.pravnoLiceTel; }
  if (p.pravnoLiceEmail) { ws.mergeCells("A4:I4"); ws.getCell("A4").value = `e-mail: ${p.pravnoLiceEmail}`; }
  ws.addRow([]);

  // Offer meta
  ws.addRow(["PONUDA SASTAVIO:", p.sastavio]);
  ws.addRow(["DATUM:", p.datum.toLocaleDateString("sr-Latn")]);
  ws.addRow(["PONUDA VAŽI DO:", p.vaziDo.toLocaleDateString("sr-Latn")]);
  ws.addRow(["BROJ PONUDE:", p.brojPonude]).font = { bold: true };
  ws.addRow([]);
  const klijentRow = ws.addRow(["KLIJENT/ AGENCIJA:", p.agencija ? `${p.klijent} — ${p.agencija}` : p.klijent]);
  klijentRow.font = { bold: true };
  if (p.klijentAdresa) ws.addRow(["", p.klijentAdresa]);
  ws.addRow(["KAMPANJA:", p.kampanjaNaziv]);
  ws.addRow(["PERIOD:", p.period]);
  ws.addRow(["GRAD:", p.grad]);
  ws.addRow(["BROJ VOZILA:", p.brojVozila]);
  ws.addRow([]);

  // Tip kampanje section title
  const sectionRow = ws.addRow([p.poddeonica]);
  sectionRow.font = { bold: true, size: 12 };
  ws.mergeCells(`A${sectionRow.number}:I${sectionRow.number}`);

  // Table header
  const headerRow = ws.addRow(["Rb", "Opis", "Grad", "Broj vozila", `Cena (${p.valuta})`, "Popust %", `Cena sa popustom (${p.valuta})`, `Popust (${p.valuta})`, `Ukupno (${p.valuta})`]);
  headerRow.font = { bold: true };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };
  headerRow.border = { top: { style: "thin" }, bottom: { style: "thin" } };

  let ukupno = 0;
  for (const s of p.stavke) {
    const popust = s.cena - s.cenaSaPopustom;
    const uk = s.cenaSaPopustom * s.brojVozila;
    ukupno += uk;
    const r = ws.addRow([s.rb, s.opis, s.grad, s.brojVozila, s.cena, s.popustPct + "%", s.cenaSaPopustom, popust, uk]);
    r.getCell(5).numFmt = '#,##0.00';
    r.getCell(7).numFmt = '#,##0.00';
    r.getCell(8).numFmt = '#,##0.00';
    r.getCell(9).numFmt = '#,##0.00';
  }
  // Totals
  ws.addRow([]);
  const totalRow = ws.addRow(["", "", "", "UKUPNO :", "", "", "", "", ukupno]);
  totalRow.font = { bold: true };
  totalRow.getCell(9).numFmt = '#,##0.00';

  if (p.ukupnoZaProdukciju) {
    const prodRow = ws.addRow(["", "", "", "UKUPNO ZA PRODUKCIJU", "", "", "", "", p.ukupnoZaProdukciju]);
    prodRow.getCell(9).numFmt = '#,##0.00';
  }

  const pdv = ukupno * (p.stopaPdv / 100);
  const grand = ukupno + pdv;
  ws.addRow(["", "", "", `PDV ${p.stopaPdv}%`, "", "", "", "", pdv]).getCell(9).numFmt = '#,##0.00';
  const grandRow = ws.addRow(["", "", "", "UKUPNO SA PDV", "", "", "", "", grand]);
  grandRow.font = { bold: true, size: 12 };
  grandRow.getCell(9).numFmt = '#,##0.00';

  // Notes block
  ws.addRow([]);
  const notesHeader = ws.addRow(["NAPOMENA I OPŠTI USLOVI POSLOVANJA:"]);
  notesHeader.font = { bold: true };
  const defaultNote = p.napomena ?? (
    "Ponuda se odnosi na zakup vozila javnog gradskog prevoza i oslikavanje spoljašnjosti vozila. " +
    "Na cenu zakupa vozila odobren je popust u skladu sa periodom trajanja zakupa i brojem ukupno zakupljenih vozila. " +
    "U osnovnu cenu je uključen zakup vozila, montaža reklamne poruke, dostavljanje fotodokumentacije, održavanje u periodu zakupa i uklanjanje reklamne poruke po isteku zakupa. " +
    "Rok za oslikavanje spoljašnjosti vozila je 10 radnih dana od dana dostavljanja grafičke pripreme. " +
    "Zakup se računa od datuma postavljanja reklamne poruke. " +
    "Fakturisanje usluga se vrši na osnovu ponude tj. ugovora. " +
    "Sve cene su izražene u " + p.valuta + ". " +
    "U navedene cene nije uračunat pripadajući PDV u iznosu od " + p.stopaPdv + "%."
  );
  const noteRow = ws.addRow([defaultNote]);
  ws.mergeCells(`A${noteRow.number}:I${noteRow.number}`);
  noteRow.getCell(1).alignment = { wrapText: true, vertical: "top" };
  ws.getRow(noteRow.number).height = 150;

  // Contact footer
  ws.addRow([]);
  ws.addRow([`Kontakt: ${p.sastavio}${p.sastavioEmail ? ", " + p.sastavioEmail : ""}${p.sastavioTel ? ", " + p.sastavioTel : ""}`]);
  ws.addRow(["M.P. / Potpis naručioca:"]);

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

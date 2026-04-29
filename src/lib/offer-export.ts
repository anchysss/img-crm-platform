/**
 * Klijentski XLSX export za ponudu (offer) — IMG branding template.
 * Boje: IMG red (C70028), tamno-siva header, beli text na headeru.
 */

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
  poddeonica: string;
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

const IMG_RED = "FFC70028";       // ARGB — IMG primarna boja
const IMG_DARK = "FF1F2937";      // ARGB — tamna header
const IMG_LIGHT = "FFF3F4F6";     // light gray
const IMG_ACCENT = "FFFEE2E2";    // light red

export async function downloadOfferXlsx(filename: string, p: OfferParams) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = p.pravnoLiceNaziv;
  wb.created = new Date();
  const ws = wb.addWorksheet("Ponuda", {
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } },
  });

  // Column widths matching P432/P466 IMG primer
  ws.columns = [
    { width: 5 },   // A: Rb
    { width: 42 },  // B: Opis
    { width: 16 },  // C: Grad
    { width: 11 },  // D: Broj vozila
    { width: 13 },  // E: Cena
    { width: 10 },  // F: Popust %
    { width: 16 },  // G: Cena sa popustom
    { width: 13 },  // H: Popust €
    { width: 16 },  // I: Ukupno
  ];

  // ======= ZAGLAVLJE — IMG branding traka =======
  ws.mergeCells("A1:I3");
  const headerCell = ws.getCell("A1");
  headerCell.value = p.pravnoLiceNaziv;
  headerCell.font = { bold: true, size: 18, color: { argb: "FFFFFFFF" } };
  headerCell.alignment = { vertical: "middle", horizontal: "center" };
  headerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: IMG_RED } };
  ws.getRow(1).height = 28;

  // Adresa + kontakt
  ws.mergeCells("A4:I4");
  ws.getCell("A4").value = p.pravnoLiceAdresa;
  ws.getCell("A4").alignment = { horizontal: "center" };
  ws.getCell("A4").font = { size: 9, italic: true };

  ws.mergeCells("A5:I5");
  const contactParts: string[] = [];
  if (p.pravnoLiceTel) contactParts.push(p.pravnoLiceTel);
  if (p.pravnoLiceEmail) contactParts.push(p.pravnoLiceEmail);
  ws.getCell("A5").value = contactParts.join("  |  ");
  ws.getCell("A5").alignment = { horizontal: "center" };
  ws.getCell("A5").font = { size: 9, color: { argb: "FF6B7280" } };
  ws.addRow([]);

  // ======= PONUDA naslov =======
  ws.mergeCells("A7:I7");
  const titleCell = ws.getCell("A7");
  titleCell.value = `PONUDA  ${p.brojPonude}`;
  titleCell.font = { bold: true, size: 16, color: { argb: IMG_RED } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(7).height = 26;
  // Bottom red border on title
  titleCell.border = { bottom: { style: "thick", color: { argb: IMG_RED } } };

  ws.addRow([]);

  // ======= META BLOK (datum, vaziDo, sastavio) =======
  function metaRow(label: string, value: string, bold = false) {
    const r = ws.addRow([label, value]);
    ws.mergeCells(`B${r.number}:I${r.number}`);
    r.getCell(1).font = { bold: true, size: 10, color: { argb: IMG_DARK.replace("FF", "FF") } };
    r.getCell(1).alignment = { horizontal: "right" };
    r.getCell(2).font = { bold, size: 10 };
    r.getCell(2).alignment = { horizontal: "left", indent: 1 };
  }
  metaRow("DATUM:", p.datum.toLocaleDateString("sr-Latn"));
  metaRow("PONUDA VAŽI DO:", p.vaziDo.toLocaleDateString("sr-Latn"));
  metaRow("PONUDU SASTAVIO:", p.sastavio + (p.sastavioEmail ? ` (${p.sastavioEmail})` : ""));

  ws.addRow([]);

  // ======= KLIJENT / KAMPANJA blok =======
  function blockRow(label: string, value: string) {
    const r = ws.addRow([label, value]);
    ws.mergeCells(`B${r.number}:I${r.number}`);
    r.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: IMG_LIGHT } };
    r.getCell(1).font = { bold: true, size: 10 };
    r.getCell(1).border = { left: { style: "medium", color: { argb: IMG_RED } } };
    r.getCell(1).alignment = { vertical: "middle", indent: 1 };
    r.getCell(2).font = { size: 11, bold: true };
    r.getCell(2).alignment = { vertical: "middle", indent: 1 };
    r.height = 18;
  }
  blockRow("KLIJENT / AGENCIJA:", p.agencija ? `${p.klijent} — ${p.agencija}` : p.klijent);
  if (p.klijentAdresa) blockRow("ADRESA:", p.klijentAdresa);
  blockRow("KAMPANJA:", p.kampanjaNaziv);
  blockRow("PERIOD:", p.period);
  blockRow("GRAD:", p.grad);
  blockRow("BROJ VOZILA:", String(p.brojVozila));

  ws.addRow([]);

  // ======= Section title (npr. OUTDOOR / INDOOR) =======
  const sectionRow = ws.addRow([p.poddeonica]);
  ws.mergeCells(`A${sectionRow.number}:I${sectionRow.number}`);
  sectionRow.getCell(1).font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
  sectionRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
  sectionRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: IMG_DARK } };
  sectionRow.height = 22;

  // ======= Table header =======
  const headerRow = ws.addRow([
    "Rb",
    "Opis",
    "Grad",
    `Vozila`,
    `Cena (${p.valuta})`,
    "Popust %",
    `Sa popustom (${p.valuta})`,
    `Popust (${p.valuta})`,
    `Ukupno (${p.valuta})`,
  ]);
  headerRow.height = 30;
  for (let c = 1; c <= 9; c++) {
    const cell = headerRow.getCell(c);
    cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: IMG_RED } };
    cell.alignment = { horizontal: c <= 3 ? "left" : "right", vertical: "middle", wrapText: true };
    cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin", color: { argb: "FFFFFFFF" } }, right: { style: "thin", color: { argb: "FFFFFFFF" } } };
  }

  // ======= Stavke =======
  let ukupno = 0;
  for (const s of p.stavke) {
    const popust = s.cena - s.cenaSaPopustom;
    const uk = s.cenaSaPopustom * s.brojVozila;
    ukupno += uk;
    const r = ws.addRow([s.rb, s.opis, s.grad, s.brojVozila, s.cena, s.popustPct / 100, s.cenaSaPopustom, popust * s.brojVozila, uk]);
    r.height = 22;
    for (let c = 1; c <= 9; c++) {
      r.getCell(c).border = { top: { style: "thin", color: { argb: "FFE5E7EB" } }, bottom: { style: "thin", color: { argb: "FFE5E7EB" } }, left: { style: "thin", color: { argb: "FFE5E7EB" } }, right: { style: "thin", color: { argb: "FFE5E7EB" } } };
      r.getCell(c).alignment = { vertical: "middle", horizontal: c <= 3 ? "left" : "right", indent: c <= 3 ? 1 : 0 };
    }
    r.getCell(5).numFmt = '#,##0.00';
    r.getCell(6).numFmt = '0.00%';
    r.getCell(7).numFmt = '#,##0.00';
    r.getCell(8).numFmt = '#,##0.00';
    r.getCell(9).numFmt = '#,##0.00';
    r.getCell(9).font = { bold: true };
  }

  // ======= Totali =======
  const pdv = ukupno * (p.stopaPdv / 100);
  const grand = ukupno + pdv;

  function totalRow(label: string, value: number, opts: { bold?: boolean; bg?: string; color?: string; size?: number } = {}) {
    const r = ws.addRow(["", "", "", "", "", "", "", label, value]);
    r.height = 22;
    const bg = opts.bg ?? IMG_LIGHT;
    const labelCell = r.getCell(8);
    const valueCell = r.getCell(9);
    labelCell.alignment = { horizontal: "right", vertical: "middle", indent: 1 };
    valueCell.alignment = { horizontal: "right", vertical: "middle", indent: 1 };
    labelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
    valueCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
    labelCell.font = { bold: opts.bold ?? true, size: opts.size ?? 10, color: { argb: opts.color ?? IMG_DARK } };
    valueCell.font = { bold: opts.bold ?? true, size: opts.size ?? 10, color: { argb: opts.color ?? IMG_DARK } };
    valueCell.numFmt = '#,##0.00';
    labelCell.border = { top: { style: "thin" }, bottom: { style: "thin" } };
    valueCell.border = { top: { style: "thin" }, bottom: { style: "thin" } };
  }
  totalRow("UKUPNO (bez PDV):", ukupno, { bg: IMG_LIGHT });
  if (p.ukupnoZaProdukciju) totalRow("UKUPNO ZA PRODUKCIJU:", p.ukupnoZaProdukciju, { bg: IMG_LIGHT });
  totalRow(`PDV ${p.stopaPdv}%:`, pdv, { bg: IMG_LIGHT });
  totalRow("UKUPNO SA PDV:", grand, { bold: true, bg: IMG_RED, color: "FFFFFFFF", size: 12 });

  ws.addRow([]);

  // ======= NAPOMENA =======
  const noteHeader = ws.addRow(["NAPOMENA I OPŠTI USLOVI POSLOVANJA:"]);
  ws.mergeCells(`A${noteHeader.number}:I${noteHeader.number}`);
  noteHeader.getCell(1).font = { bold: true, size: 11, color: { argb: IMG_RED } };

  const defaultNote = p.napomena ?? (
    "Ponuda se odnosi na zakup vozila javnog gradskog prevoza i oslikavanje spoljašnjosti vozila. " +
    "Na cenu zakupa vozila odobren je popust u skladu sa periodom trajanja zakupa i brojem ukupno zakupljenih vozila. " +
    "U osnovnu cenu je uključen zakup vozila, montaža reklamne poruke, dostavljanje fotodokumentacije, održavanje u periodu zakupa i uklanjanje reklamne poruke po isteku zakupa. " +
    "Cena produkcije zavisi od vrste dogovorenog brandinga. Garancija na folije je 12 meseci. " +
    "Izrada i dostavljanje grafičkog idejnog rešenja je obaveza naručioca kampanje. " +
    "Naručilac kampanje dužan je dostaviti sadržaj reklamne poruke u skladu sa važećim zakonima Republike Srbije. " +
    "Rok za oslikavanje spoljašnjosti vozila je 10 radnih dana od dana dostavljanja grafičke pripreme. " +
    "Zakup se računa od datuma postavljanja reklamne poruke. " +
    "Izveštaj o početku kampanje se šalje klijentu u pisanoj formi i sadrži garažne brojeve vozila, datum od kog se vozila sa reklamnim rešenjem nalaze u saobraćaju i fotografije sa montaže. " +
    "Foto izveštaj iz saobraćaja se šalje klijentu u roku od 7 radnih dana. " +
    "Fakturisanje usluga se vrši na osnovu ponude tj. ugovora. " +
    "Sve cene su izražene u " + p.valuta + ". " +
    "U navedene cene nije uračunat pripadajući porez na dodatu vrednost (PDV) u iznosu od " + p.stopaPdv + "%."
  );
  const noteRow = ws.addRow([defaultNote]);
  ws.mergeCells(`A${noteRow.number}:I${noteRow.number}`);
  noteRow.getCell(1).alignment = { wrapText: true, vertical: "top" };
  noteRow.getCell(1).font = { size: 8, color: { argb: "FF374151" } };
  noteRow.height = 180;

  ws.addRow([]);

  // ======= Potpisi =======
  const sigRow = ws.addRow(["", "", "M.P.", "", "", "", "", "Sastavio:", ""]);
  sigRow.getCell(3).font = { bold: true, size: 10 };
  sigRow.getCell(8).font = { bold: true, size: 10 };

  const sigRow2 = ws.addRow([
    "", "", "_______________________", "", "", "", "",
    p.sastavio,
    "",
  ]);
  sigRow2.getCell(3).alignment = { horizontal: "center" };
  sigRow2.getCell(8).font = { italic: true, size: 10 };

  if (p.sastavioEmail || p.sastavioTel) {
    const sigRow3 = ws.addRow(["", "", "Naručilac (potpis i pečat)", "", "", "", "", [p.sastavioEmail, p.sastavioTel].filter(Boolean).join("  ·  "), ""]);
    sigRow3.getCell(3).font = { size: 8, color: { argb: "FF6B7280" } };
    sigRow3.getCell(3).alignment = { horizontal: "center" };
    sigRow3.getCell(8).font = { size: 8, color: { argb: "FF6B7280" } };
  }

  ws.addRow([]);
  // Footer
  const footer = ws.addRow([`Generisano: ${new Date().toLocaleString("sr-Latn")} · IMG CRM`]);
  ws.mergeCells(`A${footer.number}:I${footer.number}`);
  footer.getCell(1).alignment = { horizontal: "center" };
  footer.getCell(1).font = { size: 8, italic: true, color: { argb: "FF9CA3AF" } };

  // Print: repeat header on each page
  ws.pageSetup.printTitlesRow = "1:7";

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

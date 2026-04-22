/**
 * Klijentski CSV + XLSX izvoz za Reports modul (PZ 4.13).
 * XLSX koristi ExcelJS dinamički import (lazy, ne ulazi u initial bundle).
 */
export function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) {
    const blob = new Blob(["\ufeff"], { type: "text/csv;charset=utf-8" });
    triggerDownload(blob, filename);
    return;
  }
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => escapeCsv(r[h])).join(","));
  }
  const csv = "\ufeff" + lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  triggerDownload(blob, filename);
}

export async function downloadXlsx(filename: string, sheetName: string, rows: Array<Record<string, unknown>>) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "IMG CRM";
  wb.created = new Date();
  const ws = wb.addWorksheet(sheetName.slice(0, 31));
  if (rows.length > 0) {
    const headers = Object.keys(rows[0]);
    ws.columns = headers.map((h) => ({ header: h, key: h, width: Math.max(12, Math.min(40, h.length + 6)) }));
    for (const r of rows) ws.addRow(r);
    const hdr = ws.getRow(1);
    hdr.font = { bold: true };
    hdr.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };
  }
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  triggerDownload(blob, filename);
}

function escapeCsv(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

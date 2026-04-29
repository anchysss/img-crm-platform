"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

const BCMEDIABOX_TEMPLATE = [
  "Šifra,Lokacija,Dobavljač,Tip vozila,Registarski broj,Inventurni broj,Oznaka,Garaža,Linija,Od,Do,Aktivan,Model,GPS,Opis,Broj ugovora,Kom.naknada (Datum do)",
  "BG-001,Beograd,JKP GSP BEOGRAD,Autobus zglobni,BG123-AB,3001,,GSP Novi Beograd,\"BG, 88 ZEMUN - NOVI ŽELEZNIK\",2024-01-01,2026-12-31,DA,Solaris Urbino 18,DA,U ZAKUPU,UG-2024-001,2027-01-01",
  "BG-002,Beograd,JKP GSP BEOGRAD,Tramvaj solo KT4,,201,,GSP Centrala,\"BG, Tramvajske KT4 linije 2, 3, 5\",,,DA,KT4,DA,U ZAKUPU,,",
].join("\n");

const HEADER_MAP: Record<string, string> = {
  "šifra": "sifra", "sifra": "sifra",
  "lokacija": "lokacija",
  "dobavljač": "dobavljac", "dobavljac": "dobavljac",
  "tip vozila": "tipVozila",
  "registarski broj": "registracija", "reg broj": "registracija", "reg. broj": "registracija",
  "inventurni broj": "inventurniBroj", "inv broj": "inventurniBroj", "inv. broj": "inventurniBroj",
  "oznaka": "oznaka",
  "garaža": "garaza", "garaza": "garaza",
  "linija": "linija",
  "od": "od",
  "do": "do",
  "aktivan": "aktivan",
  "model": "model",
  "gps": "gps",
  "opis": "opis",
  "broj ugovora": "brojUgovora",
  "kom.naknada (datum do)": "komNaknadaDatumDo", "kom.naknada datum do": "komNaknadaDatumDo", "kom naknada": "komNaknadaDatumDo",
};

function parseCsv(text: string): string[][] {
  // Minimalni CSV parser sa quoted stringovima
  const rows: string[][] = [];
  let cur = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else cur += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(cur); cur = ""; }
      else if (c === "\r") { /* skip */ }
      else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
      else cur += c;
    }
  }
  if (cur.length > 0 || row.length > 0) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

export default function VozilaImportPage() {
  const [csv, setCsv] = useState("");
  const [result, setResult] = useState<any>(null);
  const mut = trpc.vehicles.bulkImport.useMutation({ onSuccess: (r: any) => setResult(r) });

  async function submit() {
    setResult(null);
    const rows = parseCsv(csv);
    if (rows.length < 2) return;
    const headers = rows[0].map((h) => (HEADER_MAP[h.trim().toLowerCase()] ?? h.trim().toLowerCase()));
    const parsed = rows.slice(1).map((r) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = (r[i] ?? "").trim(); });
      return {
        sifra: obj.sifra,
        lokacija: obj.lokacija,
        dobavljac: obj.dobavljac,
        tipVozila: obj.tipVozila,
        registracija: obj.registracija,
        inventurniBroj: obj.inventurniBroj,
        oznaka: obj.oznaka,
        garaza: obj.garaza,
        linija: obj.linija,
        od: obj.od,
        do: obj.do,
        aktivan: obj.aktivan,
        model: obj.model,
        gps: obj.gps,
        opis: obj.opis,
        brojUgovora: obj.brojUgovora,
        komNaknadaDatumDo: obj.komNaknadaDatumDo,
      };
    }).filter((r) => r.registracija);
    if (parsed.length === 0) { setResult({ ok: false, error: "Nema redova sa 'Registarski broj' kolonom" }); return; }
    await mut.mutateAsync({ rows: parsed });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Bulk import vozila (bcMediaBox format)</h1>
          <p className="text-sm text-muted-foreground">Kolone: Šifra · Lokacija · Dobavljač · Tip vozila · Registarski broj · Inventurni broj · Oznaka · Garaža · Linija · Od · Do · Aktivan · Model · GPS · Opis · Broj ugovora · Kom.naknada (Datum do)</p>
        </div>
        <Link href="/logistika/vozila" className="text-sm text-muted-foreground hover:underline">← Nazad na vozila</Link>
      </div>

      <section className="rounded-md border bg-secondary/20 p-4">
        <h2 className="mb-2 font-semibold">Uputstvo</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>Otvori svoj bcMediaBox Excel → Save As → CSV UTF-8 (comma).</li>
          <li>Otvori CSV fajl kao tekst (Notepad, TextEdit, VSCode) i <strong>copy-paste</strong> u polje ispod.</li>
          <li>Prvi red mora da sadrži nazive kolona (srpski iz bcMediaBox-a ili engleski alias).</li>
          <li>&quot;Aktivan&quot; i &quot;GPS&quot; — prihvataju DA/NE, TRUE/FALSE, 1/0.</li>
          <li>Datumi u formatu <code>YYYY-MM-DD</code> ili <code>DD.MM.YYYY</code>.</li>
          <li>&quot;Linija&quot; — ako je više linija, razdvoji <code>;</code> ili <code>|</code>.</li>
          <li>Postojeća vozila (prema &quot;Registarski broj&quot;) se preskaču.</li>
        </ol>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setCsv(BCMEDIABOX_TEMPLATE)}>Učitaj šablon</Button>
        </div>
      </section>

      <section className="rounded-md border p-4">
        <h2 className="mb-3 font-semibold">CSV paste</h2>
        <Textarea rows={16} placeholder="Nalepi bcMediaBox CSV ovde..." value={csv} onChange={(e) => setCsv(e.target.value)} className="font-mono text-xs" />
        <div className="mt-3 flex justify-end">
          <Button onClick={submit} disabled={!csv.trim() || mut.isPending}>{mut.isPending ? "Uvoz u toku..." : "Pokreni import"}</Button>
        </div>

        {result && (
          <div className="mt-4 rounded-md border bg-secondary/30 p-3 text-sm">
            {result.ok === false ? <p className="text-destructive">{result.error}</p> : (
              <>
                <div>✅ Uvezeno: <strong>{result.created}</strong></div>
                <div>⏭ Preskočeno (već postoje): <strong>{result.skipped}</strong></div>
                {result.errors?.length > 0 && (
                  <>
                    <div className="mt-2 font-semibold text-destructive">Greške ({result.errors.length}):</div>
                    <ul className="list-disc pl-5 text-xs">
                      {result.errors.slice(0, 20).map((e: any, i: number) => <li key={i}>Red {e.row}: {e.error}</li>)}
                    </ul>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

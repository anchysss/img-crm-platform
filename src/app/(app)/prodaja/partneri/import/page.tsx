"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Textarea, Field, Select } from "@/components/ui/input";
import { downloadCsv } from "@/lib/export";

type Entity = "partneri" | "kontakti" | "vozila";

export default function ImportPage() {
  const [entity, setEntity] = useState<Entity>("partneri");
  const [csv, setCsv] = useState("");
  const [result, setResult] = useState<any>(null);
  const partneri = trpc.imports.partners.useMutation({ onSuccess: (r: any) => setResult(r) });
  const kontakti = trpc.imports.kontakti.useMutation({ onSuccess: (r: any) => setResult(r) });
  const vozila = trpc.imports.vozila.useMutation({ onSuccess: (r: any) => setResult(r) });

  const allPartneri = trpc.partners.list.useQuery({});
  const allVozila = trpc.vehicles.list.useQuery();

  function parse() {
    const lines = csv.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length === 0) return [];
    const headers = lines[0].split(",").map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const cells = line.split(",").map((c) => c.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = cells[i] ?? ""; });
      return row;
    });
  }

  async function submit() {
    setResult(null);
    const rows = parse();
    if (entity === "partneri") {
      await partneri.mutateAsync({
        rows: rows.map((r) => ({
          naziv: r.naziv,
          tip: (r.tip as any) || "DIRECT",
          segment: (r.segment as any) || "C",
          zemlja: r.zemlja,
          grad: r.grad,
          pibVat: r.pibVat,
          maticniBroj: r.maticniBroj,
          adresa: r.adresa,
          napomene: r.napomene,
        })).filter((r) => r.naziv),
      });
    } else if (entity === "kontakti") {
      await kontakti.mutateAsync({
        rows: rows.map((r) => ({
          partnerNaziv: r.partnerNaziv,
          ime: r.ime,
          email: r.email || undefined,
          telefon: r.telefon,
          pozicija: r.pozicija,
          primarni: r.primarni === "true" || r.primarni === "1",
        })).filter((r) => r.partnerNaziv && r.ime),
      });
    } else if (entity === "vozila") {
      await vozila.mutateAsync({
        rows: rows.map((r) => ({
          registracija: r.registracija,
          tip: (r.tip as any) || "BUS",
          grad: r.grad,
          zemlja: r.zemlja,
        })).filter((r) => r.registracija && r.grad),
      });
    }
  }

  function exportPartneri() {
    const rows = (allPartneri.data ?? []).map((p: any) => ({
      naziv: p.naziv, tip: p.tip, segment: p.segment, zemlja: p.zemlja, grad: p.grad, pibVat: p.pibVat, maticniBroj: p.maticniBroj, adresa: p.adresa,
    }));
    downloadCsv("partneri.csv", rows);
  }
  function exportVozila() {
    const rows = (allVozila.data ?? []).map((v: any) => ({ registracija: v.registracija, tip: v.tip, grad: v.grad, zemlja: v.zemlja, status: v.status }));
    downloadCsv("vozila.csv", rows);
  }

  const templates: Record<Entity, string> = {
    partneri: "naziv,tip,segment,zemlja,grad,pibVat,maticniBroj,adresa,napomene\nExample Brand d.o.o.,DIRECT,A,RS,Beograd,123456789,20123456,Bulevar 1,Glavni klijent",
    kontakti: "partnerNaziv,ime,email,telefon,pozicija,primarni\nExample Brand d.o.o.,Petar Petrović,petar@example.com,+381641112233,CMO,true",
    vozila: "registracija,tip,grad,zemlja\nBG-123-AB,BUS,Beograd,RS",
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Bulk import / export</h1>

      <section className="grid gap-3 md:grid-cols-2">
        <div className="rounded-md border p-4">
          <h2 className="mb-2 font-semibold">Export (CSV)</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportPartneri}>Partneri CSV</Button>
            <Button variant="outline" onClick={exportVozila}>Vozila CSV</Button>
          </div>
        </div>

        <div className="rounded-md border p-4">
          <h2 className="mb-2 font-semibold">Šablon</h2>
          <p className="text-xs text-muted-foreground">Kopiraj u Excel, popuni, copy-paste nazad u tekst polje ispod.</p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setCsv(templates[entity])}>Učitaj šablon</Button>
          </div>
        </div>
      </section>

      <section className="rounded-md border p-4">
        <h2 className="mb-3 font-semibold">Import (CSV paste)</h2>
        <div className="mb-3 flex items-end gap-3">
          <Field label="Entitet">
            <Select value={entity} onChange={(e) => { setEntity(e.target.value as Entity); setCsv(""); setResult(null); }}>
              <option value="partneri">Partneri</option>
              <option value="kontakti">Kontakti</option>
              <option value="vozila">Vozila</option>
            </Select>
          </Field>
          <Button onClick={submit} disabled={!csv.trim() || partneri.isPending || kontakti.isPending || vozila.isPending}>Pokreni import</Button>
        </div>
        <Textarea rows={12} placeholder="Nalepi CSV ovde..." value={csv} onChange={(e) => setCsv(e.target.value)} className="font-mono text-xs" />

        {result && (
          <div className="mt-4 rounded-md border bg-secondary/30 p-3 text-sm">
            <div><strong>Kreirano:</strong> {result.created}</div>
            <div><strong>Preskočeno (duplikati):</strong> {result.skipped}</div>
            {result.errors?.length > 0 && (
              <>
                <div className="mt-2 font-semibold text-destructive">Greške:</div>
                <ul className="list-disc pl-5 text-xs">
                  {result.errors.map((e: any, i: number) => <li key={i}>Red {e.row}: {e.error}</li>)}
                </ul>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

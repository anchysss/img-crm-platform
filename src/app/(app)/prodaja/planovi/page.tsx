"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field, Select } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Avg", "Sep", "Okt", "Nov", "Dec"];

export default function PlanoviPage() {
  const [tab, setTab] = useState<"godisnji" | "realizacija" | "dnevni">("godisnji");
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Planovi rada</h1>
        <div className="flex gap-1 rounded-md border p-1">
          <Button size="sm" variant={tab === "godisnji" ? "default" : "ghost"} onClick={() => setTab("godisnji")}>Godišnji target</Button>
          <Button size="sm" variant={tab === "realizacija" ? "default" : "ghost"} onClick={() => setTab("realizacija")}>Realizacija vs Plan</Button>
          <Button size="sm" variant={tab === "dnevni" ? "default" : "ghost"} onClick={() => setTab("dnevni")}>Dnevni</Button>
        </div>
      </div>
      {tab === "godisnji" && <GodisnjiPlan />}
      {tab === "realizacija" && <RealizacijaVsPlan />}
      {tab === "dnevni" && <DnevniPlan />}
    </div>
  );
}

function RealizacijaVsPlan() {
  const [godina, setGodina] = useState(new Date().getFullYear());
  const me = trpc.users.me.useQuery();
  const data = trpc.opportunities.progressVsPlan.useQuery({ godina });
  const valuta = me.data?.roles?.[0]?.pravnoLice?.valuta ?? "EUR";

  if (!data.data) return <p>Učitavam...</p>;
  const { cells, kategorije } = data.data;

  // Compute totals per row (kategorija) and per col (mesec)
  const totalsRow: Record<string, { target: number; realized: number; weighted: number }> = {};
  const totalsCol: Record<number, { target: number; realized: number; weighted: number }> = {};
  let grandTarget = 0, grandRealized = 0, grandWeighted = 0;
  for (const k of kategorije) {
    totalsRow[k.id] = { target: 0, realized: 0, weighted: 0 };
    for (let m = 1; m <= 12; m++) {
      const c = cells[`${k.id}:${m}`] ?? { target: 0, realized: 0, weighted: 0, pipeline: 0 };
      totalsRow[k.id].target += c.target;
      totalsRow[k.id].realized += c.realized;
      totalsRow[k.id].weighted += c.weighted;
      totalsCol[m] ??= { target: 0, realized: 0, weighted: 0 };
      totalsCol[m].target += c.target;
      totalsCol[m].realized += c.realized;
      totalsCol[m].weighted += c.weighted;
      grandTarget += c.target;
      grandRealized += c.realized;
      grandWeighted += c.weighted;
    }
  }

  function cellColor(c: any) {
    if (!c || c.target === 0) return "";
    const pct = (c.realized / c.target) * 100;
    if (pct >= 100) return "bg-emerald-100 dark:bg-emerald-950/30";
    if (pct >= 70) return "bg-amber-100 dark:bg-amber-950/30";
    return "bg-red-50 dark:bg-red-950/20";
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-end gap-3">
        <Field label="Godina"><Input type="number" value={godina} onChange={(e) => setGodina(Number(e.target.value))} /></Field>
        <div className="ml-auto grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-md border bg-card p-2 text-center"><div className="text-xs text-muted-foreground">Target</div><div className="font-bold">{formatCurrency(grandTarget, valuta)}</div></div>
          <div className="rounded-md border bg-card p-2 text-center"><div className="text-xs text-muted-foreground">Realizovano</div><div className="font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(grandRealized, valuta)}</div></div>
          <div className="rounded-md border bg-card p-2 text-center"><div className="text-xs text-muted-foreground">Weighted pipeline</div><div className="font-bold">{formatCurrency(grandWeighted, valuta)}</div></div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="min-w-full text-xs">
          <thead className="bg-secondary/60 text-left">
            <tr>
              <th className="sticky left-0 z-10 bg-secondary/80 px-2 py-2">Kategorija</th>
              {MONTHS.map((m, i) => <th key={i} className="px-1 py-2 text-right">{m}</th>)}
              <th className="px-2 py-2 text-right">Σ</th>
            </tr>
          </thead>
          <tbody>
            {kategorije.map((k: any) => {
              const tot = totalsRow[k.id];
              if (!tot || (tot.target === 0 && tot.realized === 0)) return null;
              return (
                <tr key={k.id} className="border-t">
                  <td className="sticky left-0 bg-background px-2 py-1 font-medium whitespace-nowrap">{k.naziv}</td>
                  {MONTHS.map((_, i) => {
                    const c = cells[`${k.id}:${i + 1}`];
                    return (
                      <td key={i} className={`px-1 py-1 text-right text-[10px] ${cellColor(c)}`}>
                        {c && c.target ? (
                          <>
                            <div className="font-semibold">{c.realized.toFixed(0)}</div>
                            <div className="text-muted-foreground">/{c.target.toFixed(0)}</div>
                          </>
                        ) : c && c.realized ? <span className="text-emerald-700">+{c.realized.toFixed(0)}</span> : <span className="text-muted-foreground">—</span>}
                      </td>
                    );
                  })}
                  <td className="px-2 py-1 text-right font-medium">
                    {tot.target > 0 ? <span className={tot.realized >= tot.target ? "text-emerald-700" : ""}>{Math.round((tot.realized / tot.target) * 100)}%</span> : <span className="text-muted-foreground">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-secondary/40">
            <tr>
              <td className="px-2 py-2 font-semibold">Po mesecu</td>
              {MONTHS.map((_, i) => {
                const c = totalsCol[i + 1];
                return (
                  <td key={i} className="px-1 py-2 text-right text-[10px]">
                    {c && c.target > 0 ? <span className={c.realized >= c.target ? "text-emerald-700" : ""}>{Math.round((c.realized / c.target) * 100)}%</span> : "—"}
                  </td>
                );
              })}
              <td className="px-2 py-2 text-right font-bold">
                {grandTarget > 0 ? `${Math.round((grandRealized / grandTarget) * 100)}%` : "—"}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="text-xs text-muted-foreground">
        💡 Ćelija: <strong>realizovano / target</strong>. Boja: zelena ≥ 100%, žuta ≥ 70%, crvena &lt; 70%. Realizovano = Won prilike u tom mesecu po kategoriji.
      </div>
    </section>
  );
}

function GodisnjiPlan() {
  const [godina, setGodina] = useState(new Date().getFullYear());
  const me = trpc.users.me.useQuery();
  const kategorije = trpc.katalozi.kategorijeList.useQuery();
  const existing = trpc.planovi.godisnjiMine.useQuery({ godina });
  const upsert = trpc.planovi.godisnjiUpsert.useMutation({ onSuccess: () => existing.refetch() });
  const valuta = me.data?.roles?.[0]?.pravnoLice?.valuta ?? "EUR";

  // Matrica: kategorijaId -> mesec (1..12) -> target
  const [matrix, setMatrix] = useState<Record<string, Record<number, string>>>({});
  const [napomena, setNapomena] = useState("");

  useEffect(() => {
    if (existing.data) {
      const m: Record<string, Record<number, string>> = {};
      for (const s of existing.data.stavke) {
        m[s.kategorijaId] ??= {};
        m[s.kategorijaId][s.mesec] = String(s.target);
      }
      setMatrix(m);
      setNapomena(existing.data.napomena ?? "");
    } else {
      setMatrix({});
      setNapomena("");
    }
  }, [existing.data]);

  function setCell(kategorijaId: string, mesec: number, value: string) {
    setMatrix((m) => ({ ...m, [kategorijaId]: { ...(m[kategorijaId] ?? {}), [mesec]: value } }));
  }

  async function save() {
    const stavke: Array<{ kategorijaId: string; mesec: number; target: string; valuta: string }> = [];
    for (const [kid, mesecMap] of Object.entries(matrix)) {
      for (const [m, val] of Object.entries(mesecMap)) {
        if (val && !Number.isNaN(Number(val))) {
          stavke.push({ kategorijaId: kid, mesec: Number(m), target: val, valuta });
        }
      }
    }
    await upsert.mutateAsync({ godina, napomena, stavke });
  }

  const total = Object.values(matrix).reduce((acc, cat) => acc + Object.values(cat).reduce((a, v) => a + (Number(v) || 0), 0), 0);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Field label="Godina"><Input type="number" value={godina} onChange={(e) => setGodina(Number(e.target.value))} /></Field>
        <Field label="Napomena"><Input value={napomena} onChange={(e) => setNapomena(e.target.value)} /></Field>
        <Button onClick={save} disabled={upsert.isPending} className="self-end">Sačuvaj plan</Button>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="min-w-full text-xs">
          <thead className="bg-secondary/60 text-left">
            <tr>
              <th className="sticky left-0 z-10 bg-secondary/80 px-2 py-2">Kategorija delatnosti</th>
              {MONTHS.map((m) => <th key={m} className="px-2 py-2 text-right">{m}</th>)}
              <th className="px-2 py-2 text-right">Ukupno</th>
            </tr>
          </thead>
          <tbody>
            {(kategorije.data ?? []).map((k: any) => {
              const rowTotal = Object.values(matrix[k.id] ?? {}).reduce((a, v) => a + (Number(v) || 0), 0);
              return (
                <tr key={k.id} className="border-t">
                  <td className="sticky left-0 bg-background px-2 py-1 font-medium whitespace-nowrap">{k.naziv}</td>
                  {MONTHS.map((_, i) => (
                    <td key={i} className="px-1">
                      <input
                        type="number"
                        step="0.01"
                        value={matrix[k.id]?.[i + 1] ?? ""}
                        onChange={(e) => setCell(k.id, i + 1, e.target.value)}
                        className="w-20 rounded border bg-background px-2 py-1 text-right text-xs"
                      />
                    </td>
                  ))}
                  <td className="px-2 py-1 text-right font-medium">{formatCurrency(rowTotal, valuta)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-secondary/40">
            <tr>
              <td className="px-2 py-2 font-semibold">Ukupno</td>
              {MONTHS.map((_, i) => {
                const colTotal = Object.values(matrix).reduce((a, cat) => a + (Number(cat[i + 1]) || 0), 0);
                return <td key={i} className="px-2 py-2 text-right text-xs font-medium">{colTotal ? formatCurrency(colTotal, valuta) : "—"}</td>;
              })}
              <td className="px-2 py-2 text-right font-bold">{formatCurrency(total, valuta)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

function DnevniPlan() {
  const [datum, setDatum] = useState(new Date().toISOString().slice(0, 10));
  const listQ = trpc.planovi.dnevniList.useQuery({});
  const upsert = trpc.planovi.dnevniUpsert.useMutation({ onSuccess: () => listQ.refetch() });
  const [opis, setOpis] = useState("");
  const [analiza, setAnaliza] = useState("");

  async function save() {
    if (!opis.trim()) return;
    await upsert.mutateAsync({ datum: new Date(datum), opis, analizaTrzista: analiza || undefined });
    setOpis("");
    setAnaliza("");
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-md border bg-secondary/20 p-4">
        <h2 className="mb-3 font-semibold">Novi dnevni plan</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Datum"><Input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} /></Field>
          <div></div>
          <Field label="Opis (pozivi, ponude, sastanci, izveštaji, naplate)">
            <Textarea rows={4} placeholder="Npr.: Pozvati Delhaize za status ponude P432. Poslati Lilly mesečni izveštaj postbrendinga. Sastanak sa WPP Media u 14h." value={opis} onChange={(e) => setOpis(e.target.value)} />
          </Field>
          <Field label="Analiza tržišta">
            <Textarea rows={4} placeholder="Npr.: Konkurencija lansirala novu kampanju u Beogradu; pratimo odziv u segmentu FMCG." value={analiza} onChange={(e) => setAnaliza(e.target.value)} />
          </Field>
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={save} disabled={upsert.isPending || !opis.trim()}>Sačuvaj dnevni plan</Button>
        </div>
      </div>

      <div>
        <h2 className="mb-2 font-semibold">Moji dnevni planovi</h2>
        <div className="flex flex-col gap-2">
          {(listQ.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Još nema zapisa.</p>}
          {(listQ.data ?? []).map((p: any) => (
            <div key={p.id} className="rounded-md border p-3 text-sm">
              <div className="mb-1 text-xs font-semibold text-muted-foreground">{formatDate(p.datum)}</div>
              <div className="whitespace-pre-wrap">{p.opis}</div>
              {p.analizaTrzista && <div className="mt-2 rounded bg-secondary/30 p-2 text-xs whitespace-pre-wrap"><strong>Analiza:</strong> {p.analizaTrzista}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

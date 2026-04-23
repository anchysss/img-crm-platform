"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input, Select, Field, Textarea } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { useTenant } from "@/lib/use-tenant";

interface Stavka { rb: number; opis: string; grad: string; brojVozila: number; cena: string; popustPct: string; }

export default function NovaPonudaPage() {
  const router = useRouter();
  const qs = useSearchParams();
  const partnerIdParam = qs.get("partnerId");
  const opportunityIdParam = qs.get("opportunityId");
  const tenant = useTenant();

  const partneri = trpc.lookups.partnersShort.useQuery();
  const paketi = trpc.katalozi.paketiList.useQuery();
  const cenovnik = trpc.katalozi.cenovnikList.useQuery();
  const opportunities = trpc.opportunities.list.useQuery({});
  const createMut = trpc.ponude.create.useMutation({ onSuccess: (p: any) => router.push(`/prodaja/ponude/${p.id}`) });

  const [form, setForm] = useState({
    partnerId: partnerIdParam ?? "",
    opportunityId: opportunityIdParam ?? "",
    vaziDo: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    valuta: "EUR",
    stopaPdv: "20",
    napomena: "",
  });
  const [stavke, setStavke] = useState<Stavka[]>([
    { rb: 1, opis: "OUTDOOR - Total branding", grad: tenant.capital || "Beograd", brojVozila: 5, cena: "650", popustPct: "10" },
  ]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!form.partnerId && partneri.data?.[0]) setForm((f) => ({ ...f, partnerId: partneri.data![0].id }));
  }, [partneri.data, form.partnerId]);

  useEffect(() => {
    if (tenant.valuta && form.valuta !== tenant.valuta) setForm((f) => ({ ...f, valuta: tenant.valuta }));
  }, [tenant.valuta, form.valuta]);

  useEffect(() => {
    if (tenant.capital) {
      setStavke((cur) => cur.map((s, i) => (i === 0 && !s.grad ? { ...s, grad: tenant.capital } : s)));
    }
  }, [tenant.capital]);

  const podzbir = stavke.reduce((a, s) => {
    const brutto = Number(s.cena) * s.brojVozila;
    return a + brutto * (1 - Number(s.popustPct) / 100);
  }, 0);
  const pdv = (podzbir * Number(form.stopaPdv)) / 100;
  const ukupno = podzbir + pdv;

  function add() {
    setStavke((s) => [...s, { rb: s.length + 1, opis: "", grad: tenant.capital, brojVozila: 1, cena: "0", popustPct: "0" }]);
  }
  function updateCell(i: number, patch: Partial<Stavka>) { setStavke((s) => s.map((x, idx) => (idx === i ? { ...x, ...patch } : x))); }
  function remove(i: number) { setStavke((s) => s.filter((_, idx) => idx !== i).map((x, idx) => ({ ...x, rb: idx + 1 }))); }

  function addFromPaket(paketId: string) {
    const p = (paketi.data ?? []).find((x: any) => x.id === paketId);
    if (!p) return;
    setStavke((s) => [...s, { rb: s.length + 1, opis: p.naziv, grad: p.grad, brojVozila: p.brojVozila, cena: String(p.cena), popustPct: "0" }]);
  }
  function addFromCenovnik(cenovnikId: string) {
    const c = (cenovnik.data ?? []).find((x: any) => x.id === cenovnikId);
    if (!c) return;
    setStavke((s) => [...s, { rb: s.length + 1, opis: c.naziv, grad: tenant.capital, brojVozila: 1, cena: String(c.cena), popustPct: "0" }]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createMut.mutateAsync({
        ...form,
        opportunityId: form.opportunityId || undefined,
        vaziDo: new Date(form.vaziDo),
        stavke: stavke.map((s) => ({
          rb: s.rb,
          opis: s.opis,
          grad: s.grad || undefined,
          brojVozila: s.brojVozila,
          cena: s.cena,
          popustPct: s.popustPct,
        })),
      } as any);
    } catch (e: any) { setError(e.message); }
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Nova ponuda</h1>
        <p className="text-sm text-muted-foreground">Nakon snimanja automatski se generiše formatirani dokument za preuzimanje (XLSX) i štampu (PDF).</p>
      </header>

      <form onSubmit={submit} className="flex flex-col gap-6">
        <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Klijent *">
            <Select required value={form.partnerId} onChange={(e) => setForm({ ...form, partnerId: e.target.value })}>
              <option value="">—</option>
              {(partneri.data ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.naziv}</option>)}
            </Select>
          </Field>
          <Field label="Prilika (Opportunity) opciono">
            <Select value={form.opportunityId} onChange={(e) => setForm({ ...form, opportunityId: e.target.value })}>
              <option value="">— bez prilike —</option>
              {(opportunities.data ?? []).filter((o: any) => o.partnerId === form.partnerId).map((o: any) => (
                <option key={o.id} value={o.id}>{o.naziv}</option>
              ))}
            </Select>
          </Field>
          <Field label="Važi do *">
            <Input type="date" required value={form.vaziDo} onChange={(e) => setForm({ ...form, vaziDo: e.target.value })} />
          </Field>
          <Field label="Valuta">
            <Select value={form.valuta} onChange={(e) => setForm({ ...form, valuta: e.target.value })}>
              <option>EUR</option><option>RSD</option><option>BAM</option>
            </Select>
          </Field>
          <Field label="Stopa PDV (%)">
            <Input type="number" step="0.1" value={form.stopaPdv} onChange={(e) => setForm({ ...form, stopaPdv: e.target.value })} />
          </Field>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Stavke</h2>
            <div className="flex items-end gap-2">
              <Select onChange={(e) => { if (e.target.value) { addFromPaket(e.target.value); e.target.value = ""; } }} className="min-w-[220px]">
                <option value="">+ Dodaj iz paketa ({paketi.data?.length ?? 0})</option>
                {(paketi.data ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.naziv}</option>)}
              </Select>
              <Select onChange={(e) => { if (e.target.value) { addFromCenovnik(e.target.value); e.target.value = ""; } }} className="min-w-[220px]">
                <option value="">+ Dodaj iz cenovnika ({cenovnik.data?.length ?? 0})</option>
                {(cenovnik.data ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.naziv}</option>)}
              </Select>
              <Button type="button" variant="outline" size="sm" onClick={add}>+ Prazna stavka</Button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-left">
                <tr>
                  <th className="px-2 py-2 w-10">Rb</th>
                  <th className="px-2 py-2">Opis</th>
                  <th className="px-2 py-2 w-32">Grad</th>
                  <th className="px-2 py-2 w-20">Vozila</th>
                  <th className="px-2 py-2 w-28">Cena ({form.valuta})</th>
                  <th className="px-2 py-2 w-20">Popust %</th>
                  <th className="px-2 py-2 w-32 text-right">Ukupno</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {stavke.map((s, i) => {
                  const iznos = Number(s.cena) * s.brojVozila * (1 - Number(s.popustPct) / 100);
                  return (
                    <tr key={i} className="border-t">
                      <td className="px-2 py-1.5">{s.rb}</td>
                      <td className="px-2 py-1"><Input value={s.opis} onChange={(e) => updateCell(i, { opis: e.target.value })} /></td>
                      <td className="px-2 py-1"><Input value={s.grad} onChange={(e) => updateCell(i, { grad: e.target.value })} /></td>
                      <td className="px-2 py-1"><Input type="number" value={s.brojVozila} onChange={(e) => updateCell(i, { brojVozila: Number(e.target.value) })} /></td>
                      <td className="px-2 py-1"><Input type="number" step="0.01" value={s.cena} onChange={(e) => updateCell(i, { cena: e.target.value })} /></td>
                      <td className="px-2 py-1"><Input type="number" step="0.1" value={s.popustPct} onChange={(e) => updateCell(i, { popustPct: e.target.value })} /></td>
                      <td className="px-2 py-1.5 text-right font-medium">{formatCurrency(iznos, form.valuta)}</td>
                      <td className="px-2"><Button type="button" size="sm" variant="ghost" onClick={() => remove(i)}>×</Button></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-secondary/20">
                <tr><td colSpan={6} className="px-2 py-1.5 text-right text-sm">Podzbir</td><td className="px-2 py-1.5 text-right font-medium">{formatCurrency(podzbir, form.valuta)}</td><td></td></tr>
                <tr><td colSpan={6} className="px-2 py-1.5 text-right text-sm">PDV {form.stopaPdv}%</td><td className="px-2 py-1.5 text-right">{formatCurrency(pdv, form.valuta)}</td><td></td></tr>
                <tr className="border-t"><td colSpan={6} className="px-2 py-2 text-right font-bold">Ukupno sa PDV</td><td className="px-2 py-2 text-right font-bold">{formatCurrency(ukupno, form.valuta)}</td><td></td></tr>
              </tfoot>
            </table>
          </div>
        </section>

        <Field label="Napomena (ako prazno, koristi se standardna IMG napomena)">
          <Textarea value={form.napomena} onChange={(e) => setForm({ ...form, napomena: e.target.value })} rows={4} />
        </Field>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>Otkaži</Button>
          <Button type="submit" disabled={createMut.isPending || stavke.length === 0 || !form.partnerId}>
            {createMut.isPending ? "Čuvam..." : "Sačuvaj ponudu"}
          </Button>
        </div>
      </form>
    </div>
  );
}

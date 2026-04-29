"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input, Select, Field, Textarea } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";

interface StavkaForm { opis: string; kolicina: string; jedinicnaCena: string; popust: string; }

export default function NewInvoicePage() {
  const router = useRouter();
  const qs = useSearchParams();
  const kampanjaIdParam = qs.get("kampanjaId");

  const ponudaIdParam = qs.get("ponudaId");
  const partners = trpc.lookups.partnersShort.useQuery();
  const campaigns = trpc.campaigns.list.useQuery();
  const ponude = trpc.ponude.list.useQuery({ status: "PRIHVACENA" as any });
  const create = trpc.invoices.create.useMutation({
    onSuccess: () => router.push("/invoices"),
  });

  const [form, setForm] = useState({
    tip: "PREDRACUN" as const,
    partnerId: "",
    kampanjaId: kampanjaIdParam ?? "",
    ponudaId: ponudaIdParam ?? "",
    opportunityId: "",
    datum: new Date().toISOString().slice(0, 10),
    rokPlacanja: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    valuta: "EUR",
    stopaPdv: 21,
    napomene: "",
  });
  const [stavke, setStavke] = useState<StavkaForm[]>([
    { opis: "Zakup oglasnog prostora", kolicina: "1", jedinicnaCena: "1000", popust: "0" },
  ]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!form.partnerId && partners.data?.[0]) {
      setForm((f) => ({ ...f, partnerId: partners.data![0].id }));
    }
  }, [partners.data, form.partnerId]);

  // Ako je kampanja izabrana → preuzmi partnera i valutu iz kampanje
  useEffect(() => {
    if (form.kampanjaId && campaigns.data) {
      const k = campaigns.data.find((x: any) => x.id === form.kampanjaId);
      if (k) setForm((f) => ({ ...f, partnerId: k.partnerId, valuta: k.valuta }));
    }
  }, [form.kampanjaId, campaigns.data]);

  // Ako je ponuda izabrana → preuzmi partnera, opportunity i valutu
  useEffect(() => {
    if (form.ponudaId && ponude.data) {
      const p = ponude.data.find((x: any) => x.id === form.ponudaId);
      if (p) {
        setForm((f) => ({
          ...f,
          partnerId: p.partnerId,
          opportunityId: (p as any).opportunityId ?? f.opportunityId,
          valuta: p.valuta,
        }));
      }
    }
  }, [form.ponudaId, ponude.data]);

  const podzbir = stavke.reduce((acc, s) => {
    const brutto = Number(s.kolicina) * Number(s.jedinicnaCena);
    return acc + brutto - (brutto * Number(s.popust)) / 100;
  }, 0);
  const pdv = (podzbir * form.stopaPdv) / 100;
  const ukupno = podzbir + pdv;

  function updateStavka(i: number, patch: Partial<StavkaForm>) {
    setStavke((s) => s.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }
  function addStavka() { setStavke((s) => [...s, { opis: "", kolicina: "1", jedinicnaCena: "0", popust: "0" }]); }
  function removeStavka(i: number) { setStavke((s) => s.filter((_, idx) => idx !== i)); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await create.mutateAsync({
        ...form,
        kampanjaId: form.kampanjaId || undefined,
        ponudaId: form.ponudaId || undefined,
        opportunityId: form.opportunityId || undefined,
        datum: new Date(form.datum),
        rokPlacanja: new Date(form.rokPlacanja),
        stavke,
      } as any);
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Novi dokument</h1>
      <form onSubmit={submit} className="flex flex-col gap-6">
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="Tip *">
            <Select value={form.tip} onChange={(e) => setForm({ ...form, tip: e.target.value as any })}>
              <option value="PREDRACUN">Predračun</option>
              <option value="FAKTURA">Faktura</option>
              <option value="AVANS">Avans</option>
            </Select>
          </Field>
          <Field label="Datum *"><Input type="date" required value={form.datum} onChange={(e) => setForm({ ...form, datum: e.target.value })} /></Field>
          <Field label="Rok plaćanja"><Input type="date" value={form.rokPlacanja} onChange={(e) => setForm({ ...form, rokPlacanja: e.target.value })} /></Field>
          <Field label="Stopa PDV (%)"><Input type="number" step="0.01" value={form.stopaPdv} onChange={(e) => setForm({ ...form, stopaPdv: Number(e.target.value) })} /></Field>

          <Field label="Partner *">
            <Select required value={form.partnerId} onChange={(e) => setForm({ ...form, partnerId: e.target.value })}>
              {(partners.data ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.naziv}</option>)}
            </Select>
          </Field>
          <Field label="Kampanja">
            <Select value={form.kampanjaId} onChange={(e) => setForm({ ...form, kampanjaId: e.target.value })}>
              <option value="">— bez kampanje —</option>
              {(campaigns.data ?? []).map((k: any) => <option key={k.id} value={k.id}>{k.naziv}</option>)}
            </Select>
          </Field>
          <Field label="Ponuda (prihvaćena)" hint="PZ Faze 1: nema izgubljenih para — povezi fakturu sa ponudom">
            <Select value={form.ponudaId} onChange={(e) => setForm({ ...form, ponudaId: e.target.value })}>
              <option value="">— bez ponude —</option>
              {(ponude.data ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.broj}</option>)}
            </Select>
          </Field>
          <Field label="Valuta">
            <Select value={form.valuta} onChange={(e) => setForm({ ...form, valuta: e.target.value })}>
              <option>EUR</option><option>RSD</option><option>BAM</option>
            </Select>
          </Field>
        </section>

        <section>
          <h2 className="mb-2 font-semibold">Stavke</h2>
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-left">
                <tr>
                  <th className="px-3 py-2">Opis</th>
                  <th className="px-3 py-2 w-20">Količina</th>
                  <th className="px-3 py-2 w-28">Jed. cena</th>
                  <th className="px-3 py-2 w-20">Popust %</th>
                  <th className="px-3 py-2 w-28 text-right">Iznos</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {stavke.map((s, i) => {
                  const brutto = Number(s.kolicina) * Number(s.jedinicnaCena);
                  const iznos = brutto - (brutto * Number(s.popust)) / 100;
                  return (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2"><Input value={s.opis} onChange={(e) => updateStavka(i, { opis: e.target.value })} /></td>
                      <td className="px-3 py-2"><Input type="number" step="0.01" value={s.kolicina} onChange={(e) => updateStavka(i, { kolicina: e.target.value })} /></td>
                      <td className="px-3 py-2"><Input type="number" step="0.01" value={s.jedinicnaCena} onChange={(e) => updateStavka(i, { jedinicnaCena: e.target.value })} /></td>
                      <td className="px-3 py-2"><Input type="number" step="0.1" value={s.popust} onChange={(e) => updateStavka(i, { popust: e.target.value })} /></td>
                      <td className="px-3 py-2 text-right font-medium">{formatCurrency(iznos, form.valuta)}</td>
                      <td className="px-2"><Button type="button" size="sm" variant="ghost" onClick={() => removeStavka(i)}>×</Button></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t bg-secondary/20">
                  <td colSpan={4} className="px-3 py-2 text-right">Podzbir</td>
                  <td className="px-3 py-2 text-right font-medium">{formatCurrency(podzbir, form.valuta)}</td>
                  <td></td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-3 py-2 text-right">PDV ({form.stopaPdv}%)</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(pdv, form.valuta)}</td>
                  <td></td>
                </tr>
                <tr className="border-t">
                  <td colSpan={4} className="px-3 py-2 text-right font-bold">Ukupno</td>
                  <td className="px-3 py-2 text-right font-bold">{formatCurrency(ukupno, form.valuta)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={addStavka}>+ Dodaj stavku</Button>
        </section>

        <Field label="Napomene">
          <Textarea value={form.napomene} onChange={(e) => setForm({ ...form, napomene: e.target.value })} />
        </Field>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>Otkaži</Button>
          <Button type="submit" disabled={create.isPending || stavke.length === 0}>{create.isPending ? "Čuvam..." : "Sačuvaj dokument"}</Button>
        </div>
      </form>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, refetch } = trpc.campaigns.byId.useQuery({ id });
  const addItem = trpc.campaigns.addItem.useMutation({ onSuccess: () => refetch() });
  const removeItem = trpc.campaigns.removeItem.useMutation({ onSuccess: () => refetch() });
  const advance = trpc.campaigns.advanceStatus.useMutation({ onSuccess: () => refetch() });
  const cancel = trpc.campaigns.cancel.useMutation({ onSuccess: () => refetch() });

  if (isLoading) return <p>Učitavam...</p>;
  if (!data) return <p>Kampanja nije pronađena.</p>;

  const total = data.stavke.reduce((acc: number, s: any) => acc + Number(s.cena), 0);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{data.naziv}</h1>
          <div className="mt-1 flex gap-2 text-sm text-muted-foreground">
            <Badge>{data.status.replace("_", " ")}</Badge>
            <span>{data.partner.naziv}</span>
            <span>· {formatDate(data.odDatum)} — {formatDate(data.doDatum)}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{formatCurrency(total, data.valuta)}</div>
          <div className="text-xs text-muted-foreground">{data.stavke.length} stavki</div>
        </div>
      </header>

      <section className="flex flex-wrap gap-2">
        {data.status === "POTVRDENA" && <Button onClick={() => advance.mutate({ id, status: "U_REALIZACIJI" })}>Pokreni realizaciju</Button>}
        {data.status === "U_REALIZACIJI" && <Button onClick={() => advance.mutate({ id, status: "ZAVRSENA" })}>Završi kampanju</Button>}
        {data.status !== "OTKAZANA" && data.status !== "ZAVRSENA" && (
          <Button variant="destructive" onClick={() => {
            const razlog = prompt("Razlog otkazivanja (min 5 karaktera):");
            if (razlog && razlog.length >= 5) cancel.mutate({ id, razlog });
          }}>Otkaži kampanju</Button>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Stavke (pozicije)</h2>
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left">
              <tr>
                <th className="px-3 py-2">Vozilo</th>
                <th className="px-3 py-2">Pozicija</th>
                <th className="px-3 py-2">Period</th>
                <th className="px-3 py-2 text-right">Cena</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {data.stavke.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Nema stavki. Dodajte pozicije ispod.</td></tr>
              )}
              {data.stavke.map((s: any) => (
                <tr key={s.id} className="border-t">
                  <td className="px-3 py-2 font-mono">{s.pozicija.vozilo.registracija}</td>
                  <td className="px-3 py-2">{s.pozicija.tip}</td>
                  <td className="px-3 py-2">{formatDate(s.odDatum)} — {formatDate(s.doDatum)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(Number(s.cena), s.valuta)}</td>
                  <td className="px-3 py-2 text-right">
                    {data.status === "POTVRDENA" && <Button size="sm" variant="ghost" onClick={() => removeItem.mutate({ stavkaId: s.id })}>Ukloni</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.status === "POTVRDENA" && <AddItemForm kampanjaId={id} onDone={() => refetch()} />}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Fakturisanje</h2>
        {data.dokumenti.length === 0 && (
          <p className="text-sm text-muted-foreground">Još uvek nema dokumenata. <Link href={`/invoices/new?kampanjaId=${id}`} className="text-primary hover:underline">Kreiraj predračun</Link></p>
        )}
        <div className="flex flex-col gap-2">
          {data.dokumenti.map((d: any) => (
            <div key={d.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
              <div>
                <span className="font-mono">{d.broj}</span>
                <Badge>{d.tip}</Badge>
              </div>
              <div>{formatCurrency(Number(d.ukupno), d.valuta)} · <Badge>{d.status}</Badge></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function AddItemForm({ kampanjaId, onDone }: { kampanjaId: string; onDone: () => void }) {
  const available = trpc.campaigns.availablePositions.useQuery({ kampanjaId });
  const addItem = trpc.campaigns.addItem.useMutation({ onSuccess: onDone });
  const [form, setForm] = useState({
    pozicijaId: "",
    odDatum: "",
    doDatum: "",
    cena: "500",
    valuta: "EUR",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!form.pozicijaId && available.data && available.data.length > 0) {
      setForm((f) => ({ ...f, pozicijaId: available.data![0].id }));
    }
  }, [available.data, form.pozicijaId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await addItem.mutateAsync({ ...form, kampanjaId, odDatum: new Date(form.odDatum), doDatum: new Date(form.doDatum) } as any);
    } catch (e: any) {
      setError(e.message);
    }
  }

  const free = (available.data ?? []).filter((p: any) => p.rezervacije.length === 0);

  return (
    <form onSubmit={submit} className="mt-4 grid grid-cols-2 gap-3 rounded-md border bg-secondary/30 p-3 md:grid-cols-5">
      <Field label="Pozicija (slobodne)">
        <Select value={form.pozicijaId} onChange={(e) => setForm({ ...form, pozicijaId: e.target.value })}>
          {free.length === 0 && <option value="">— nema slobodnih —</option>}
          {free.map((p: any) => <option key={p.id} value={p.id}>{p.vozilo.registracija} — {p.tip}</option>)}
        </Select>
      </Field>
      <Field label="Od datuma"><Input type="date" required value={form.odDatum} onChange={(e) => setForm({ ...form, odDatum: e.target.value })} /></Field>
      <Field label="Do datuma"><Input type="date" required value={form.doDatum} onChange={(e) => setForm({ ...form, doDatum: e.target.value })} /></Field>
      <Field label="Cena"><Input type="number" step="0.01" value={form.cena} onChange={(e) => setForm({ ...form, cena: e.target.value })} /></Field>
      <div className="flex items-end">
        <Button type="submit" disabled={!form.pozicijaId || addItem.isPending} className="w-full">Dodaj poziciju</Button>
      </div>
      {error && <p className="col-span-full text-sm text-destructive">{error}</p>}
    </form>
  );
}

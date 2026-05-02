"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input, Select, Field, Textarea } from "@/components/ui/input";
import { useTenant } from "@/lib/use-tenant";

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

export interface KampanjaCreatePrefill {
  pozicijaId?: string;
  odDatum?: Date;
  doDatum?: Date;
  /** Tip kampanje za UI label (samo informativno) */
  tipLabel?: "Outdoor" | "Indoor" | string;
}

export function KampanjaCreateDialog({ prefill, onClose }: { prefill: KampanjaCreatePrefill; onClose: () => void }) {
  const tenant = useTenant();
  const partneri = trpc.lookups.partnersShort.useQuery();
  const ponude = trpc.ponude.list.useQuery({ status: "PRIHVACENA" });
  const create = trpc.campaigns.create.useMutation({ onSuccess: onClose });
  const [form, setForm] = useState({
    naziv: "",
    partnerId: "",
    ponudaId: "",
    odDatum: prefill.odDatum ? isoDate(prefill.odDatum) : isoDate(new Date()),
    doDatum: prefill.doDatum ? isoDate(prefill.doDatum) : isoDate(addDays(new Date(), 14)),
    napomene: "",
  });
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!form.partnerId && !form.ponudaId && partneri.data?.[0]) {
      setForm((f) => ({ ...f, partnerId: partneri.data![0].id }));
    }
  }, [partneri.data, form.partnerId, form.ponudaId]);

  function onPonudaChange(ponudaId: string) {
    const p = (ponude.data ?? []).find((x: any) => x.id === ponudaId);
    if (!p) {
      setForm((f) => ({ ...f, ponudaId: "" }));
      return;
    }
    const partnerNaziv = (partneri.data ?? []).find((x: any) => x.id === p.partnerId)?.naziv ?? "";
    setForm((f) => ({
      ...f,
      ponudaId,
      partnerId: p.partnerId,
      naziv: f.naziv || `${partnerNaziv} — ${p.broj}${prefill.tipLabel ? ` (${prefill.tipLabel})` : ""}`,
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await create.mutateAsync({
        naziv: form.naziv,
        partnerId: form.partnerId,
        ponudaId: form.ponudaId || undefined,
        odDatum: new Date(form.odDatum),
        doDatum: new Date(form.doDatum),
        valuta: tenant.valuta,
        napomene: form.napomene || undefined,
        stavke: prefill.pozicijaId ? [{
          pozicijaId: prefill.pozicijaId,
          odDatum: new Date(form.odDatum),
          doDatum: new Date(form.doDatum),
          cena: "0",
        }] : undefined,
      } as any);
    } catch (e: any) { setErr(e.message); }
  }

  const dostupnePonude = (ponude.data ?? []).filter((p: any) => !form.partnerId || p.partnerId === form.partnerId || p.id === form.ponudaId);
  const partnerNazivByPart = new Map((partneri.data ?? []).map((p: any) => [p.id, p.naziv] as const));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <div className="my-8 w-full max-w-2xl rounded-lg bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold">
          {prefill.pozicijaId
            ? `Nova ${prefill.tipLabel ?? ""} kampanja na ovoj poziciji`.trim()
            : "Nova kampanja"}
        </h2>
        {prefill.pozicijaId && (
          <div className="mb-3 rounded-md border bg-secondary/30 p-3 text-xs">
            ✅ Pozicija je pred-popunjena{prefill.tipLabel ? ` (${prefill.tipLabel})` : ""}.
            Period {form.odDatum} — {form.doDatum} će biti rezervisan automatski.
          </div>
        )}
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <Field label="Vezana ponuda *">
            <Select required value={form.ponudaId} onChange={(e) => onPonudaChange(e.target.value)}>
              <option value="">— izaberi prihvaćenu ponudu —</option>
              {dostupnePonude.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.broj} · {partnerNazivByPart.get(p.partnerId) ?? "—"} · {Number(p.ukupno).toLocaleString("sr-Latn")} {p.valuta}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Naziv kampanje *">
            <Input required value={form.naziv} onChange={(e) => setForm({ ...form, naziv: e.target.value })} placeholder="Auto-popunjeno iz ponude" />
          </Field>
          <Field label="Klijent (auto iz ponude) *">
            <Select required value={form.partnerId} onChange={(e) => setForm({ ...form, partnerId: e.target.value })} disabled={Boolean(form.ponudaId)}>
              <option value="">—</option>
              {(partneri.data ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.naziv}</option>)}
            </Select>
          </Field>
          <Field label="Valuta"><Input value={tenant.valuta} disabled /></Field>
          <Field label="Trajanje od *"><Input type="date" required value={form.odDatum} onChange={(e) => setForm({ ...form, odDatum: e.target.value })} /></Field>
          <Field label="Trajanje do *"><Input type="date" required value={form.doDatum} onChange={(e) => setForm({ ...form, doDatum: e.target.value })} /></Field>
          {prefill.pozicijaId && (
            <div className="col-span-2 rounded-md border bg-secondary/20 p-2 text-[11px] text-muted-foreground">
              💡 Cene se vode u ponudi (nivo stavke), ne u kampanji.
            </div>
          )}
          <div className="col-span-2">
            <Field label="Napomene">
              <Textarea rows={3} value={form.napomene} onChange={(e) => setForm({ ...form, napomene: e.target.value })} />
            </Field>
          </div>
          {err && <p className="col-span-2 text-sm text-destructive">{err}</p>}
          <div className="col-span-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Otkaži</Button>
            <Button type="submit" disabled={create.isPending || !form.naziv || !form.partnerId || !form.ponudaId}>
              {create.isPending ? "Čuvam..." : "Kreiraj kampanju"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

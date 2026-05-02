"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input, Select, Field, Textarea } from "@/components/ui/input";
import { useTenant } from "@/lib/use-tenant";

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

export interface KampanjaCreatePrefill {
  pozicijaId?: string;
  /** Alternativa pozicijaId — server kreira poziciju ako ne postoji */
  voziloId?: string;
  pozicijaTip?: "CELO_VOZILO" | "UNUTRA" | "ZADNJI_DEO" | "BOK_LEVO" | "BOK_DESNO" | "DRUGO";
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

  // Filtriraj ponude po izabranom klijentu — ako klijent nije izabran, prikaži sve
  const ponudeFiltered = (ponude.data ?? []).filter((p: any) =>
    !form.partnerId || p.partnerId === form.partnerId
  );

  function onPartnerChange(partnerId: string) {
    setForm((f) => ({
      ...f,
      partnerId,
      // Reset ponuda ako više ne pripada izabranom klijentu
      ponudaId: ponudeFiltered.some((p: any) => p.id === f.ponudaId && p.partnerId === partnerId) ? f.ponudaId : "",
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      // Stavka: pošalji ili pozicijaId ili voziloId+tip (server razrešava)
      const stavka = (prefill.pozicijaId || (prefill.voziloId && prefill.pozicijaTip))
        ? [{
            pozicijaId: prefill.pozicijaId,
            voziloId: prefill.voziloId,
            pozicijaTip: prefill.pozicijaTip,
            odDatum: new Date(form.odDatum),
            doDatum: new Date(form.doDatum),
            cena: "0",
          }]
        : undefined;
      await create.mutateAsync({
        naziv: form.naziv,
        partnerId: form.partnerId,
        ponudaId: form.ponudaId || undefined,
        odDatum: new Date(form.odDatum),
        doDatum: new Date(form.doDatum),
        valuta: tenant.valuta, // valuta se uzima iz tenanta automatski
        napomene: form.napomene || undefined,
        stavke: stavka,
      } as any);
    } catch (e: any) { setErr(e.message); }
  }

  const partnerNazivByPart = new Map((partneri.data ?? []).map((p: any) => [p.id, p.naziv] as const));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <div className="my-8 w-full max-w-2xl rounded-lg bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold">
          {prefill.pozicijaId || prefill.voziloId
            ? `Nova ${prefill.tipLabel ?? ""} kampanja`.trim()
            : "Nova kampanja"}
        </h2>
        {(prefill.pozicijaId || prefill.voziloId) && (
          <div className="mb-3 rounded-md border bg-secondary/30 p-3 text-xs">
            ✅ Pozicija je pred-popunjena{prefill.tipLabel ? ` (${prefill.tipLabel})` : ""}.
            Period {form.odDatum} — {form.doDatum} će biti rezervisan automatski.
          </div>
        )}
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <Field label="Klijent *">
            <Select required value={form.partnerId} onChange={(e) => onPartnerChange(e.target.value)}>
              <option value="">— izaberi klijenta —</option>
              {(partneri.data ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.naziv}</option>)}
            </Select>
          </Field>
          <Field label="Vezana ponuda *">
            <Select required value={form.ponudaId} onChange={(e) => setForm({ ...form, ponudaId: e.target.value })} disabled={!form.partnerId}>
              <option value="">{form.partnerId ? "— izaberi prihvaćenu ponudu —" : "(prvo izaberi klijenta)"}</option>
              {ponudeFiltered.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.broj} · {Number(p.ukupno).toLocaleString("sr-Latn")} {p.valuta}
                </option>
              ))}
            </Select>
          </Field>
          <div className="col-span-2">
            <Field label="Naziv kampanje *">
              <Input required value={form.naziv} onChange={(e) => setForm({ ...form, naziv: e.target.value })} placeholder="Npr. P&G PARCIJAL — maj 2026" />
            </Field>
          </div>
          <Field label="Trajanje od *"><Input type="date" required value={form.odDatum} onChange={(e) => setForm({ ...form, odDatum: e.target.value })} /></Field>
          <Field label="Trajanje do *"><Input type="date" required value={form.doDatum} onChange={(e) => setForm({ ...form, doDatum: e.target.value })} /></Field>
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

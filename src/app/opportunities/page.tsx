"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function OpportunitiesPage() {
  const [open, setOpen] = useState(false);
  const { data, isLoading, refetch } = trpc.opportunities.list.useQuery({});

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Opportunities</h1>
        <Button onClick={() => setOpen(true)}>+ Nova prilika</Button>
      </div>
      {isLoading ? <p>Učitavam...</p> : (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left">
              <tr>
                <th className="px-3 py-2">Naziv</th>
                <th className="px-3 py-2">Partner</th>
                <th className="px-3 py-2">Vlasnik</th>
                <th className="px-3 py-2">Stage</th>
                <th className="px-3 py-2 text-right">Vrednost</th>
                <th className="px-3 py-2 text-right">Weighted</th>
                <th className="px-3 py-2">Zatvaranje</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((o: any) => {
                const weighted = Number(o.expValue) * (o.probability / 100);
                return (
                  <tr key={o.id} className="border-t">
                    <td className="px-3 py-2 font-medium"><Link href={`/opportunities/${o.id}`} className="hover:underline">{o.naziv}</Link></td>
                    <td className="px-3 py-2">{o.partner?.naziv}</td>
                    <td className="px-3 py-2">{o.vlasnik?.ime} {o.vlasnik?.prezime}</td>
                    <td className="px-3 py-2"><StageBadge kod={o.stage?.kod} /></td>
                    <td className="px-3 py-2 text-right">{formatCurrency(Number(o.expValue), o.valuta)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(weighted, o.valuta)}</td>
                    <td className="px-3 py-2">{formatDate(o.expCloseDate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {open && <OpportunityCreateDialog onClose={() => { setOpen(false); refetch(); }} />}
    </div>
  );
}

function StageBadge({ kod }: { kod: string }) {
  const map: Record<string, any> = {
    NEW: "default",
    QUALIFIED: "info",
    PROPOSAL_SENT: "info",
    NEGOTIATION: "warning",
    VERBALLY_CONFIRMED: "warning",
    WON: "success",
    LOST: "danger",
  };
  return <Badge variant={map[kod] ?? "default"}>{kod}</Badge>;
}

function OpportunityCreateDialog({ onClose }: { onClose: () => void }) {
  const me = trpc.users.me.useQuery();
  const partners = trpc.lookups.partnersShort.useQuery();
  const reps = trpc.lookups.salesReps.useQuery();
  const createMut = trpc.opportunities.create.useMutation({ onSuccess: onClose });
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    naziv: "",
    partnerId: "",
    vlasnikId: "",
    stageKod: "NEW",
    izvor: "OUTBOUND",
    valuta: "EUR",
    expValue: "1000",
    expCloseDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    opis: "",
  });

  useEffect(() => {
    if (!form.vlasnikId && me.data?.id) setForm((f) => ({ ...f, vlasnikId: me.data!.id }));
    if (!form.partnerId && partners.data?.[0]?.id) setForm((f) => ({ ...f, partnerId: partners.data![0].id }));
  }, [me.data, partners.data, form.vlasnikId, form.partnerId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createMut.mutateAsync({ ...form, expCloseDate: new Date(form.expCloseDate) } as any);
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-xl rounded-lg bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold">Nova prilika</h2>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <Field label="Naziv *"><Input required value={form.naziv} onChange={(e) => setForm({ ...form, naziv: e.target.value })} /></Field>
          <Field label="Partner *">
            <Select required value={form.partnerId} onChange={(e) => setForm({ ...form, partnerId: e.target.value })}>
              {(partners.data ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.naziv}</option>)}
            </Select>
          </Field>
          <Field label="Vlasnik *">
            <Select required value={form.vlasnikId} onChange={(e) => setForm({ ...form, vlasnikId: e.target.value })}>
              {(reps.data ?? []).map((r: any) => <option key={r.id} value={r.id}>{r.ime} {r.prezime}</option>)}
            </Select>
          </Field>
          <Field label="Izvor">
            <Select value={form.izvor} onChange={(e) => setForm({ ...form, izvor: e.target.value })}>
              <option value="INBOUND">Inbound</option>
              <option value="OUTBOUND">Outbound</option>
              <option value="REFERRAL">Referral</option>
              <option value="EXISTING_CLIENT">Postojeći klijent</option>
              <option value="AGENCY">Agencija</option>
            </Select>
          </Field>
          <Field label="Očekivana vrednost *"><Input required type="number" step="0.01" value={form.expValue} onChange={(e) => setForm({ ...form, expValue: e.target.value })} /></Field>
          <Field label="Valuta *">
            <Select value={form.valuta} onChange={(e) => setForm({ ...form, valuta: e.target.value })}>
              <option>EUR</option><option>RSD</option><option>BAM</option>
            </Select>
          </Field>
          <Field label="Očekivani datum zatvaranja *"><Input required type="date" value={form.expCloseDate} onChange={(e) => setForm({ ...form, expCloseDate: e.target.value })} /></Field>
          <Field label="Stage">
            <Select value={form.stageKod} onChange={(e) => setForm({ ...form, stageKod: e.target.value })}>
              <option value="NEW">New</option>
              <option value="QUALIFIED">Qualified</option>
            </Select>
          </Field>
          {error && <p className="col-span-2 text-sm text-destructive">{error}</p>}
          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Otkaži</Button>
            <Button type="submit" disabled={createMut.isPending}>{createMut.isPending ? "Čuvam..." : "Sačuvaj"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

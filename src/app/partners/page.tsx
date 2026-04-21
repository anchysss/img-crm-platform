"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function PartnersPage() {
  const [q, setQ] = useState("");
  const [tip, setTip] = useState("");
  const [open, setOpen] = useState(false);

  const { data, isLoading, refetch } = trpc.partners.list.useQuery({ q: q || undefined, tip: (tip || undefined) as any });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Partneri</h1>
        <Button onClick={() => setOpen(true)}>+ Novi partner</Button>
      </div>

      <div className="flex gap-3">
        <Input placeholder="Pretraga po nazivu..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Select value={tip} onChange={(e) => setTip(e.target.value)} className="max-w-xs">
          <option value="">Svi tipovi</option>
          <option value="DIRECT">Direct</option>
          <option value="AGENCY">Agency</option>
          <option value="RESELLER">Reseller</option>
          <option value="PROVIDER">Provider</option>
        </Select>
      </div>

      {isLoading ? <p>Učitavam...</p> : (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left">
              <tr>
                <th className="px-3 py-2">Naziv</th>
                <th className="px-3 py-2">Tip</th>
                <th className="px-3 py-2">Segment</th>
                <th className="px-3 py-2">Grad</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((p: any) => (
                <tr key={p.id} className="border-t">
                  <td className="px-3 py-2 font-medium">
                    <Link href={`/partners/${p.id}`} className="hover:underline">{p.naziv}</Link>
                  </td>
                  <td className="px-3 py-2"><Badge>{p.tip}</Badge></td>
                  <td className="px-3 py-2">{p.segment}</td>
                  <td className="px-3 py-2">{p.grad ?? "—"}</td>
                  <td className="px-3 py-2">
                    {p.status === "AKTIVAN" ? <Badge variant="success">{p.status}</Badge> : <Badge variant="warning">{p.status}</Badge>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link href={`/partners/${p.id}`} className="text-xs text-primary hover:underline">Otvori</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && <PartnerCreateDialog onClose={() => { setOpen(false); refetch(); }} />}
    </div>
  );
}

function PartnerCreateDialog({ onClose }: { onClose: () => void }) {
  const createMut = trpc.partners.create.useMutation({ onSuccess: onClose });
  const [form, setForm] = useState({ naziv: "", tip: "DIRECT", segment: "C", zemlja: "ME", grad: "", pibVat: "", maticniBroj: "" });
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createMut.mutateAsync(form as any);
    } catch (err: any) {
      setError(err.message ?? "Greška pri čuvanju");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold">Novi partner</h2>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <Field label="Naziv *">
            <Input required value={form.naziv} onChange={(e) => setForm({ ...form, naziv: e.target.value })} />
          </Field>
          <Field label="Tip *">
            <Select value={form.tip} onChange={(e) => setForm({ ...form, tip: e.target.value })}>
              <option value="DIRECT">Direct</option>
              <option value="AGENCY">Agency</option>
              <option value="RESELLER">Reseller</option>
              <option value="PROVIDER">Provider</option>
            </Select>
          </Field>
          <Field label="Segment">
            <Select value={form.segment} onChange={(e) => setForm({ ...form, segment: e.target.value })}>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </Select>
          </Field>
          <Field label="Zemlja *">
            <Select value={form.zemlja} onChange={(e) => setForm({ ...form, zemlja: e.target.value })}>
              <option value="ME">ME</option>
              <option value="RS">RS</option>
              <option value="HR">HR</option>
              <option value="BA">BA</option>
            </Select>
          </Field>
          <Field label="Grad">
            <Input value={form.grad} onChange={(e) => setForm({ ...form, grad: e.target.value })} />
          </Field>
          <Field label="PIB/VAT">
            <Input value={form.pibVat} onChange={(e) => setForm({ ...form, pibVat: e.target.value })} />
          </Field>
          <Field label="Matični broj">
            <Input value={form.maticniBroj} onChange={(e) => setForm({ ...form, maticniBroj: e.target.value })} />
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

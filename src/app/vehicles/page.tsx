"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function VehiclesPage() {
  const [open, setOpen] = useState(false);
  const { data, isLoading, refetch } = trpc.vehicles.list.useQuery();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Vozila</h1>
        <Button onClick={() => setOpen(true)}>+ Novo vozilo</Button>
      </div>
      {isLoading ? <p>Učitavam...</p> : (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left">
              <tr>
                <th className="px-3 py-2">Registracija</th>
                <th className="px-3 py-2">Tip</th>
                <th className="px-3 py-2">Grad</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Pozicije</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((v: any) => (
                <tr key={v.id} className="border-t">
                  <td className="px-3 py-2 font-mono font-medium">{v.registracija}</td>
                  <td className="px-3 py-2">{v.tip}</td>
                  <td className="px-3 py-2">{v.grad}</td>
                  <td className="px-3 py-2">
                    <Badge variant={v.status === "AKTIVNO" ? "success" : "warning"}>{v.status}</Badge>
                  </td>
                  <td className="px-3 py-2 text-right">{v.pozicije.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && <VehicleCreateDialog onClose={() => { setOpen(false); refetch(); }} />}
    </div>
  );
}

function VehicleCreateDialog({ onClose }: { onClose: () => void }) {
  const mut = trpc.vehicles.create.useMutation({ onSuccess: onClose });
  const [form, setForm] = useState({ registracija: "", tip: "BUS", zemlja: "ME", grad: "Podgorica" });
  const [err, setErr] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try { await mut.mutateAsync(form as any); } catch (e: any) { setErr(e.message); }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold">Novo vozilo</h2>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Field label="Registracija *"><Input required value={form.registracija} onChange={(e) => setForm({ ...form, registracija: e.target.value })} /></Field>
          <Field label="Tip *">
            <Select value={form.tip} onChange={(e) => setForm({ ...form, tip: e.target.value })}>
              <option value="BUS">Bus</option>
              <option value="MINI">Mini</option>
              <option value="DRUGO">Drugo</option>
            </Select>
          </Field>
          <Field label="Zemlja *">
            <Select value={form.zemlja} onChange={(e) => setForm({ ...form, zemlja: e.target.value })}>
              <option value="ME">ME</option><option value="RS">RS</option><option value="HR">HR</option><option value="BA">BA</option>
            </Select>
          </Field>
          <Field label="Grad *"><Input required value={form.grad} onChange={(e) => setForm({ ...form, grad: e.target.value })} /></Field>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Otkaži</Button>
            <Button type="submit" disabled={mut.isPending}>Sačuvaj</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

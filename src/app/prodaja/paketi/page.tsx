"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export default function PaketiPage() {
  const [grad, setGrad] = useState("");
  const { data, isLoading, refetch } = trpc.katalozi.paketiList.useQuery({ grad: grad || undefined });
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Paketi (Nalog za spoljašnjost)</h1>
        <Button onClick={() => setOpen(true)}>+ Novi paket</Button>
      </div>
      <div className="flex gap-3 text-sm">
        <label>Grad <Input className="ml-1 inline-block max-w-xs" placeholder="svi gradovi" value={grad} onChange={(e) => setGrad(e.target.value)} /></label>
      </div>
      {isLoading ? <p>Učitavam...</p> : (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left">
              <tr>
                <th className="px-3 py-2">Kod</th>
                <th className="px-3 py-2">Naziv</th>
                <th className="px-3 py-2">Grad</th>
                <th className="px-3 py-2">Tip</th>
                <th className="px-3 py-2 text-right">Vozila</th>
                <th className="px-3 py-2 text-right">Min dani</th>
                <th className="px-3 py-2 text-right">Cena</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((p: any) => (
                <tr key={p.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{p.kod}</td>
                  <td className="px-3 py-2 font-medium">{p.naziv}</td>
                  <td className="px-3 py-2">{p.grad}</td>
                  <td className="px-3 py-2"><Badge>{p.tipOglasa}</Badge></td>
                  <td className="px-3 py-2 text-right">{p.brojVozila}</td>
                  <td className="px-3 py-2 text-right">{p.minTrajanjeDana}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(Number(p.cena), p.valuta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && <PaketCreate onClose={() => { setOpen(false); refetch(); }} />}
    </div>
  );
}

function PaketCreate({ onClose }: { onClose: () => void }) {
  const mut = trpc.katalozi.paketCreate.useMutation({ onSuccess: onClose });
  const [f, setF] = useState({ kod: "", naziv: "", grad: "Beograd", tipOglasa: "OUTDOOR_TOTAL", brojVozila: 5, minTrajanjeDana: 14, cena: "0", valuta: "RSD" });
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold">Novi paket</h2>
        <form onSubmit={async (e) => { e.preventDefault(); setErr(null); try { await mut.mutateAsync(f as any); } catch (e: any) { setErr(e.message); } }} className="grid grid-cols-2 gap-3">
          <Field label="Kod *"><Input required value={f.kod} onChange={(e) => setF({ ...f, kod: e.target.value })} /></Field>
          <Field label="Naziv *"><Input required value={f.naziv} onChange={(e) => setF({ ...f, naziv: e.target.value })} /></Field>
          <Field label="Grad *"><Input required value={f.grad} onChange={(e) => setF({ ...f, grad: e.target.value })} /></Field>
          <Field label="Tip oglasa *">
            <Select value={f.tipOglasa} onChange={(e) => setF({ ...f, tipOglasa: e.target.value })}>
              <option value="OUTDOOR_TOTAL">Outdoor Total</option>
              <option value="OUTDOOR_PARCIJAL">Outdoor Parcijal</option>
              <option value="OUTDOOR_OPEN_TOP">Outdoor Open Top</option>
              <option value="INDOOR_STANDARD">Indoor Standard</option>
              <option value="INDOOR_DIGITAL">Indoor Digital</option>
            </Select>
          </Field>
          <Field label="Broj vozila *"><Input type="number" required value={f.brojVozila} onChange={(e) => setF({ ...f, brojVozila: Number(e.target.value) })} /></Field>
          <Field label="Min trajanje (dana)"><Input type="number" value={f.minTrajanjeDana} onChange={(e) => setF({ ...f, minTrajanjeDana: Number(e.target.value) })} /></Field>
          <Field label="Cena *"><Input type="number" step="0.01" required value={f.cena} onChange={(e) => setF({ ...f, cena: e.target.value })} /></Field>
          <Field label="Valuta"><Select value={f.valuta} onChange={(e) => setF({ ...f, valuta: e.target.value })}><option>EUR</option><option>RSD</option><option>BAM</option></Select></Field>
          {err && <p className="col-span-2 text-sm text-destructive">{err}</p>}
          <div className="col-span-2 flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Otkaži</Button><Button type="submit" disabled={mut.isPending}>Sačuvaj</Button></div>
        </form>
      </div>
    </div>
  );
}

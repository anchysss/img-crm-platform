"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export default function CenovnikPage() {
  const { data, isLoading, refetch } = trpc.katalozi.cenovnikList.useQuery();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Cenovnik</h1>
        <Button onClick={() => setOpen(true)}>+ Nova stavka</Button>
      </div>
      {isLoading ? <p>Učitavam...</p> : (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left">
              <tr>
                <th className="px-3 py-2">Kod</th>
                <th className="px-3 py-2">Naziv</th>
                <th className="px-3 py-2">Tip</th>
                <th className="px-3 py-2">Jedinica</th>
                <th className="px-3 py-2 text-right">Cena</th>
                <th className="px-3 py-2">Važi od</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((c: any) => (
                <tr key={c.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{c.kod}</td>
                  <td className="px-3 py-2 font-medium">{c.naziv}</td>
                  <td className="px-3 py-2"><Badge>{c.tipOglasa}</Badge></td>
                  <td className="px-3 py-2 text-xs">{c.jedinicaMere}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(Number(c.cena), c.valuta)}</td>
                  <td className="px-3 py-2 text-xs">{new Date(c.vaziOd).toISOString().slice(0, 10)}</td>
                  <td className="px-3 py-2">{c.aktivan ? <Badge variant="success">Aktivan</Badge> : <Badge>Neaktivan</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && <CenovnikCreate onClose={() => { setOpen(false); refetch(); }} />}
    </div>
  );
}

function CenovnikCreate({ onClose }: { onClose: () => void }) {
  const mut = trpc.katalozi.cenovnikCreate.useMutation({ onSuccess: onClose });
  const [f, setF] = useState({ kod: "", naziv: "", tipOglasa: "OUTDOOR_TOTAL", jedinicaMere: "PER_WEEK", cena: "0", valuta: "EUR" });
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold">Nova stavka cenovnika</h2>
        <form onSubmit={async (e) => { e.preventDefault(); setErr(null); try { await mut.mutateAsync(f as any); } catch (e: any) { setErr(e.message); } }} className="grid grid-cols-2 gap-3">
          <Field label="Kod *"><Input required value={f.kod} onChange={(e) => setF({ ...f, kod: e.target.value })} /></Field>
          <Field label="Naziv *"><Input required value={f.naziv} onChange={(e) => setF({ ...f, naziv: e.target.value })} /></Field>
          <Field label="Tip oglasa *">
            <Select value={f.tipOglasa} onChange={(e) => setF({ ...f, tipOglasa: e.target.value })}>
              <option value="OUTDOOR_TOTAL">Outdoor Total</option>
              <option value="OUTDOOR_PARCIJAL">Outdoor Parcijal</option>
              <option value="OUTDOOR_OPEN_TOP">Outdoor Open Top</option>
              <option value="INDOOR_STANDARD">Indoor Standard</option>
              <option value="INDOOR_DIGITAL">Indoor Digital</option>
              <option value="INDOOR_POSTER">Indoor Poster</option>
              <option value="INDOOR_BACKLIGHT">Indoor Backlight</option>
              <option value="DIGITAL">Digital</option>
              <option value="OSTALO">Ostalo</option>
            </Select>
          </Field>
          <Field label="Jedinica mere">
            <Select value={f.jedinicaMere} onChange={(e) => setF({ ...f, jedinicaMere: e.target.value })}>
              <option value="PER_DAY">Po danu</option>
              <option value="PER_WEEK">Po nedelji</option>
              <option value="PER_MONTH">Po mesecu</option>
              <option value="PER_CAMPAIGN">Po kampanji</option>
            </Select>
          </Field>
          <Field label="Cena *"><Input type="number" step="0.01" required value={f.cena} onChange={(e) => setF({ ...f, cena: e.target.value })} /></Field>
          <Field label="Valuta"><Select value={f.valuta} onChange={(e) => setF({ ...f, valuta: e.target.value })}><option>EUR</option><option>RSD</option><option>BAM</option></Select></Field>
          {err && <p className="col-span-2 text-sm text-destructive">{err}</p>}
          <div className="col-span-2 flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Otkaži</Button><Button type="submit" disabled={mut.isPending}>Sačuvaj</Button></div>
        </form>
      </div>
    </div>
  );
}

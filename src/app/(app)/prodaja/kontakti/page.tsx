"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const STATUS_TONE: Record<string, any> = {
  AKTIVAN: "success",
  SEASONAL: "info",
  HIGH_POTENTIAL: "info",
  LOW_POTENTIAL: "warning",
  NOT_ADVERTISING: "warning",
  COMPETITOR_LOCKED: "danger",
};

export default function KontaktiPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [tip, setTip] = useState("");
  const { data, isLoading } = trpc.partners.list.useQuery({ q: q || undefined, tip: (tip || undefined) as any });

  const filtered = (data ?? []).filter((p: any) => !status || p.status === status);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Kontakti / Klijenti</h1>
          <p className="mt-1 text-sm text-muted-foreground">Pretraga po nazivu, filter po statusu i tipu. Klik na klijent → 360 pregled.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/prodaja/partneri/import" className="inline-flex items-center rounded-md border px-3 py-2 text-sm hover:bg-secondary">Import / Export</Link>
          <Link href="/prodaja/kontakti/new" className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90">+ Novi klijent</Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input placeholder="🔍 Pretraga po nazivu..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
        <Select value={tip} onChange={(e) => setTip(e.target.value)} className="max-w-xs">
          <option value="">Svi tipovi</option>
          <option value="DIRECT">Direktni</option>
          <option value="AGENCY">Agencija</option>
          <option value="RESELLER">Reseller</option>
          <option value="PROVIDER">Provajder</option>
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-xs">
          <option value="">Svi statusi</option>
          <option value="AKTIVAN">Active</option>
          <option value="SEASONAL">Seasonal</option>
          <option value="HIGH_POTENTIAL">High potential</option>
          <option value="LOW_POTENTIAL">Low potential</option>
          <option value="NOT_ADVERTISING">Not advertising</option>
          <option value="COMPETITOR_LOCKED">Competitor locked</option>
        </Select>
      </div>

      {isLoading ? <p>Učitavam...</p> : (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left">
              <tr>
                <th className="px-3 py-2">Naziv</th>
                <th className="px-3 py-2">Tip</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Grad</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Nema rezultata.</td></tr>
              )}
              {filtered.map((p: any) => (
                <tr key={p.id} className="border-t hover:bg-secondary/30">
                  <td className="px-3 py-2">
                    <Link href={`/prodaja/kontakti/${p.id}`} className="font-medium hover:underline">{p.naziv}</Link>
                  </td>
                  <td className="px-3 py-2"><Badge>{p.tip}</Badge></td>
                  <td className="px-3 py-2"><Badge variant={STATUS_TONE[p.status]}>{p.status.replace(/_/g, " ")}</Badge></td>
                  <td className="px-3 py-2">{p.grad ?? "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <Link href={`/prodaja/kontakti/${p.id}`} className="text-xs text-primary hover:underline">Otvori →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

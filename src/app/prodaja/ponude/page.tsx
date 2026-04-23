"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc-client";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/utils";

const TONE: Record<string, any> = {
  DRAFT: "default",
  POSLATA: "info",
  PRIHVACENA: "success",
  ODBIJENA: "danger",
  ISTEKLA: "warning",
};

export default function PonudeListPage() {
  const [status, setStatus] = useState("");
  const { data, isLoading } = trpc.ponude.list.useQuery({ status: (status || undefined) as any });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Ponude</h1>
        <Link href="/prodaja/ponude/new" className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90">
          + Nova ponuda
        </Link>
      </div>

      <div className="flex gap-3">
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-xs">
          <option value="">Svi statusi</option>
          <option value="DRAFT">Draft</option>
          <option value="POSLATA">Poslata</option>
          <option value="PRIHVACENA">Prihvaćena</option>
          <option value="ODBIJENA">Odbijena</option>
          <option value="ISTEKLA">Istekla</option>
        </Select>
      </div>

      {isLoading ? <p>Učitavam...</p> : (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left">
              <tr>
                <th className="px-3 py-2">Broj</th>
                <th className="px-3 py-2">Datum</th>
                <th className="px-3 py-2">Važi do</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Ukupno</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).length === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Nema ponuda. Klikni &quot;+ Nova ponuda&quot; da kreiraš prvu.</td></tr>
              )}
              {(data ?? []).map((p: any) => (
                <tr key={p.id} className="border-t hover:bg-secondary/30">
                  <td className="px-3 py-2 font-mono">
                    <Link href={`/prodaja/ponude/${p.id}`} className="hover:underline">{p.broj}</Link>
                  </td>
                  <td className="px-3 py-2">{formatDate(p.datum)}</td>
                  <td className="px-3 py-2">{formatDate(p.vaziDo)}</td>
                  <td className="px-3 py-2"><Badge variant={TONE[p.status]}>{p.status}</Badge></td>
                  <td className="px-3 py-2 text-right font-medium">{formatCurrency(Number(p.ukupno), p.valuta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

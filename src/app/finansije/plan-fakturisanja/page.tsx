"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc-client";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

const TONE: Record<string, any> = {
  NACRT: "warning",
  POTVRDENO: "info",
  FAKTURISANO: "success",
  OTKAZAN: "danger",
};

export default function PlanFakturisanjaPage() {
  const { data, isLoading } = trpc.planFakturisanja.list.useQuery();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Plan fakturisanja</h1>
      {isLoading ? <p>Učitavam...</p> : (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left">
              <tr>
                <th className="px-3 py-2">Broj</th>
                <th className="px-3 py-2">Period kampanje</th>
                <th className="px-3 py-2 text-right">Ukupno</th>
                <th className="px-3 py-2">Mesečna podela</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).length === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Nema planova fakturisanja. Kreiraju se automatski kada ponuda pređe u Won.</td></tr>
              )}
              {(data ?? []).map((p: any) => (
                <tr key={p.id} className="border-t align-top">
                  <td className="px-3 py-2 font-mono">
                    <Link href={`/finansije/plan-fakturisanja/${p.id}`} className="hover:underline">{p.broj}</Link>
                  </td>
                  <td className="px-3 py-2 text-xs">{formatDate(p.kampanjaOd)} — {formatDate(p.kampanjaDo)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(Number(p.ukupno), p.valuta)}</td>
                  <td className="px-3 py-2 text-xs">
                    {p.stavke.map((s: any) => `${s.mesec}/${s.godina}: ${formatCurrency(Number(s.iznos), s.valuta)}`).join(" · ")}
                  </td>
                  <td className="px-3 py-2"><Badge variant={TONE[p.status]}>{p.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

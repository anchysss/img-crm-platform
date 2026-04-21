"use client";

import { trpc } from "@/lib/trpc-client";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function InvoicesPage() {
  const { data, isLoading } = trpc.invoices.list.useQuery();
  if (isLoading) return <p>Učitavam...</p>;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Fakture i predračuni</h1>
      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left">
            <tr>
              <th className="px-3 py-2">Broj</th>
              <th className="px-3 py-2">Tip</th>
              <th className="px-3 py-2">Partner</th>
              <th className="px-3 py-2">Datum</th>
              <th className="px-3 py-2 text-right">Ukupno</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((d: any) => (
              <tr key={d.id} className="border-t">
                <td className="px-3 py-2 font-mono">{d.broj}</td>
                <td className="px-3 py-2">{d.tip}</td>
                <td className="px-3 py-2">{d.partner?.naziv}</td>
                <td className="px-3 py-2">{formatDate(d.datum)}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(Number(d.ukupno), d.valuta)}</td>
                <td className="px-3 py-2">{d.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

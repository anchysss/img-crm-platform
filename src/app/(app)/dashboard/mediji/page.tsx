"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";

export default function MedijiPage() {
  const search = useSearchParams();
  const initialKamp = search?.get("kampanjaId") ?? null;
  const [selectedKampanjaId, setSelectedKampanjaId] = useState<string | null>(initialKamp);

  const { data: kampanje, isLoading } = trpc.medijiKampanje.kampanjeOverview.useQuery();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mediji po kampanji</h1>
        <span className="text-xs text-muted-foreground">
          Linkovi za fajlove (priprema, kreativa, …) + flag za probnu štampu
        </span>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Učitavam…</p> : (
        <div className="overflow-hidden rounded-md border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left">
              <tr>
                <th className="px-3 py-2">Kampanja</th>
                <th className="px-3 py-2">Klijent</th>
                <th className="px-3 py-2">Period</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Mediji</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {(kampanje ?? []).length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Nema kampanja.</td></tr>
              )}
              {(kampanje ?? []).map((k: any) => (
                <tr key={k.id} className="border-t hover:bg-secondary/20">
                  <td className="px-3 py-2 font-medium">{k.naziv}</td>
                  <td className="px-3 py-2 text-xs">{k.partner}</td>
                  <td className="px-3 py-2 text-xs">{formatDate(k.odDatum)} — {formatDate(k.doDatum)}</td>
                  <td className="px-3 py-2"><Badge>{k.status}</Badge></td>
                  <td className="px-3 py-2 text-right">
                    <span className={k.brojMedija > 0 ? "font-semibold text-emerald-700" : "text-muted-foreground"}>
                      {k.brojMedija} 📎
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" variant="outline" onClick={() => setSelectedKampanjaId(k.id)}>
                      📂 Otvori medije
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedKampanjaId && (
        <MedijiDialog kampanjaId={selectedKampanjaId} onClose={() => setSelectedKampanjaId(null)} />
      )}
    </div>
  );
}

function MedijiDialog({ kampanjaId, onClose }: { kampanjaId: string; onClose: () => void }) {
  const { data, isLoading, refetch } = trpc.medijiKampanje.list.useQuery({ kampanjaId });
  const add = trpc.medijiKampanje.add.useMutation({ onSuccess: () => refetch() });
  const update = trpc.medijiKampanje.update.useMutation({ onSuccess: () => refetch() });
  const remove = trpc.medijiKampanje.remove.useMutation({ onSuccess: () => refetch() });
  const notifyLog = trpc.medijiKampanje.notifyLogistiku.useMutation();

  const [url, setUrl] = useState("");
  const [naziv, setNaziv] = useState("");
  const [probnaStampa, setProbnaStampa] = useState(false);
  const [napomena, setNapomena] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [notifySent, setNotifySent] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    add.mutateAsync({
      kampanjaId,
      url,
      naziv: naziv || undefined,
      probnaStampa,
      napomena: napomena || undefined,
    }).then(() => {
      setUrl(""); setNaziv(""); setProbnaStampa(false); setNapomena("");
    }).catch((e: any) => setErr(e.message));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <div className="my-8 w-full max-w-3xl rounded-lg bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        {isLoading ? <p>Učitavam…</p> : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Mediji — {data?.kampanja.naziv ?? "—"}</h2>
                <p className="text-xs text-muted-foreground">{(data?.kampanja as any)?.partner?.naziv ?? "—"}</p>
              </div>
              <Button size="sm" variant="outline" onClick={onClose}>Zatvori</Button>
            </div>

            {/* Lista postojećih medija */}
            <div className="mb-4 overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-left">
                  <tr>
                    <th className="px-3 py-2 w-8">#</th>
                    <th className="px-3 py-2">Naziv / URL</th>
                    <th className="px-3 py-2 text-center">Probna štampa</th>
                    <th className="px-3 py-2">Napomena</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.mediji ?? []).length === 0 && (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Nema medija — dodaj URL ispod.</td></tr>
                  )}
                  {(data?.mediji ?? []).map((m: any, i: number) => (
                    <tr key={m.id} className="border-t">
                      <td className="px-3 py-2">{i + 1}</td>
                      <td className="px-3 py-2 text-xs">
                        <a href={m.url} target="_blank" rel="noreferrer" className="font-semibold text-red-700 hover:underline">{m.naziv ?? m.url}</a>
                        {m.naziv && <div className="text-[10px] text-muted-foreground truncate">{m.url}</div>}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={m.probnaStampa}
                          onChange={(e) => update.mutate({ id: m.id, probnaStampa: e.target.checked })}
                          className="h-4 w-4"
                        />
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{m.napomena ?? "—"}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => { if (confirm("Obrisati medij?")) remove.mutate({ id: m.id }); }}
                          className="text-xs text-red-600 hover:underline"
                        >🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Forma za dodavanje */}
            <form onSubmit={submit} className="rounded-md border bg-secondary/20 p-3">
              <h3 className="mb-3 text-sm font-semibold">Dodaj novi medij</h3>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <Input placeholder="Naziv (opciono, npr. 'HIGER preview')" value={naziv} onChange={(e) => setNaziv(e.target.value)} />
                <Input required placeholder="URL fajla *" value={url} onChange={(e) => setUrl(e.target.value)} />
                <Input placeholder="Napomena (opciono)" value={napomena} onChange={(e) => setNapomena(e.target.value)} />
                <label className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm">
                  <input type="checkbox" checked={probnaStampa} onChange={(e) => setProbnaStampa(e.target.checked)} className="h-4 w-4" />
                  <span>Treba probna štampa (kolorna proba)</span>
                </label>
              </div>
              {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
              <div className="mt-3 flex justify-between gap-2">
                <Button type="button" variant="outline" size="sm" disabled={notifySent || (data?.mediji.length ?? 0) === 0} onClick={() => {
                  notifyLog.mutateAsync({ kampanjaId }).then(() => setNotifySent(true));
                }}>
                  {notifySent ? "✓ Notifikacija poslata" : "📨 Pošalji notifikaciju logistici"}
                </Button>
                <Button type="submit" disabled={add.isPending || !url}>
                  {add.isPending ? "Dodajem…" : "+ Dodaj medij"}
                </Button>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                💡 Notifikacija logistici se automatski šalje na svaki dodat medij. Dugme iznad ručno re-send-uje skupnu poruku.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

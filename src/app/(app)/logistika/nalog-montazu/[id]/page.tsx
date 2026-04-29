"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

const STATUS_TONE: Record<string, any> = {
  NACRT: "warning",
  POSLATO: "info",
  POSTAVLJENO: "success",
  PROBLEM: "danger",
  OTKAZANO: "danger",
};

export default function NalogMontazuDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, refetch } = trpc.nalogMontazu.byId.useQuery({ id });
  const addStavka = trpc.nalogMontazu.addStavka.useMutation({ onSuccess: () => refetch() });
  const setStavkaStatus = trpc.nalogMontazu.setStavkaStatus.useMutation({ onSuccess: () => refetch() });
  const removeStavka = trpc.nalogMontazu.removeStavka.useMutation({ onSuccess: () => refetch() });
  const setNalogStatus = trpc.nalogMontazu.setStatus.useMutation({ onSuccess: () => refetch() });
  const remove = trpc.nalogMontazu.remove.useMutation({ onSuccess: () => router.push(`/logistika/radni-nalozi/${data?.radniNalogId}`) });

  const [garazniBroj, setGaraznibroj] = useState("");
  const [garaza, setGaraza] = useState("");
  const [linija, setLinija] = useState("");
  const [tipVozila, setTipVozila] = useState("");
  const [sifra, setSifra] = useState("");

  if (isLoading) return <p>Učitavam...</p>;
  if (!data) return <p>Nalog ne postoji.</p>;

  const radniNalog: any = data.radniNalog;

  return (
    <div className="flex flex-col gap-6">
      <div className="no-print flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Link href={`/logistika/radni-nalozi/${data.radniNalogId}`} className="text-sm text-muted-foreground hover:underline">← Nazad na RN</Link>
          <Badge variant={STATUS_TONE[data.status]}>{data.status}</Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => window.print()}>🖨️ Štampaj</Button>
          {data.status === "NACRT" && <Button size="sm" onClick={() => setNalogStatus.mutate({ id, status: "POSLATO" })}>Pošalji ekipi</Button>}
          {data.status === "POSLATO" && <Button size="sm" onClick={() => setNalogStatus.mutate({ id, status: "POSTAVLJENO" })}>Označi postavljeno</Button>}
          <Button size="sm" variant="outline" onClick={() => { if (confirm("Obriši nalog?")) remove.mutate({ id }); }}>Obriši</Button>
        </div>
      </div>

      {/* Print area */}
      <div className="print-area mx-auto w-full max-w-4xl rounded-md border bg-white p-10 shadow-sm text-sm text-black print:border-0 print:shadow-none">
        <header className="mb-6 flex items-start justify-between border-b-4 border-red-700 pb-4">
          <div>
            <div className="text-xs font-bold tracking-[0.2em] text-red-700">INFO MEDIA GROUP d.o.o.</div>
            <div className="mt-1 text-xs text-gray-600">Omladinskih brigada 86, West 65 Tower, Beograd</div>
            <div className="text-xs text-gray-600">Tel: +381 11 3370 553</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold uppercase">Nalog za montažu</div>
            <div className="mt-1 text-xs">Broj: <span className="font-mono font-semibold">{data.broj}</span></div>
            <div className="text-xs">Tip: <strong>{data.tip}</strong>{data.grad ? ` · ${data.grad}` : ""}</div>
            <div className="text-xs">Datum: {data.datumMontaze ? formatDate(data.datumMontaze) : "—"}</div>
          </div>
        </header>

        <section className="mb-5 grid grid-cols-2 gap-6 text-xs">
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Klijent / Kampanja</div>
            <div className="text-sm font-semibold">{radniNalog?.partner?.naziv ?? "—"}</div>
            <div>RN: <span className="font-mono">{radniNalog?.broj}</span></div>
            <div>Period: {formatDate(radniNalog?.odDatum)} — {formatDate(radniNalog?.doDatum)}</div>
          </div>
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">Ekipa</div>
            <div className="text-sm">{data.ekipa ?? "—"}</div>
            {data.napomena && <div className="mt-1 text-[11px] text-gray-600">{data.napomena}</div>}
          </div>
        </section>

        <div className="mb-2 bg-gray-900 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white">
          Stavke — vozila i raspored plakata
        </div>

        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-2 py-1 text-left">#</th>
              <th className="border px-2 py-1 text-left">Garažni br.</th>
              <th className="border px-2 py-1 text-left">Garaža</th>
              <th className="border px-2 py-1 text-left">Linija</th>
              <th className="border px-2 py-1 text-left">Tip vozila</th>
              <th className="border px-2 py-1 text-left">Šifra rasp.</th>
              <th className="border px-2 py-1 text-left">Rešenje</th>
              <th className="border px-2 py-1 text-left">Status</th>
              <th className="no-print border px-2 py-1"></th>
            </tr>
          </thead>
          <tbody>
            {data.stavke.length === 0 && (
              <tr><td colSpan={9} className="border px-2 py-3 text-center text-muted-foreground">Nema stavki — dodaj vozila ispod.</td></tr>
            )}
            {data.stavke.map((s: any, idx: number) => (
              <tr key={s.id}>
                <td className="border px-2 py-1">{idx + 1}</td>
                <td className="border px-2 py-1">{s.vozilo?.sifra ?? s.garazniBroj ?? "—"}</td>
                <td className="border px-2 py-1">{s.vozilo?.garaza ?? s.garaza ?? "—"}</td>
                <td className="border px-2 py-1">{s.linija ?? "—"}</td>
                <td className="border px-2 py-1">{s.vozilo?.tipVozilaTxt ?? s.tipVozila ?? "—"}</td>
                <td className="border px-2 py-1 font-mono">{s.sifraRasporeda ?? "—"}</td>
                <td className="border px-2 py-1">{s.resenje?.oznaka ?? "—"}</td>
                <td className="border px-2 py-1">
                  <Badge variant={STATUS_TONE[s.status]}>{s.status}</Badge>
                </td>
                <td className="no-print border px-2 py-1">
                  <select
                    className="rounded border px-1 py-0.5 text-[10px]"
                    value={s.status}
                    onChange={(e) => setStavkaStatus.mutate({ stavkaId: s.id, status: e.target.value as any })}
                  >
                    <option>NACRT</option>
                    <option>POSLATO</option>
                    <option>POSTAVLJENO</option>
                    <option>PROBLEM</option>
                    <option>OTKAZANO</option>
                  </select>
                  <button className="ml-1 text-[10px] text-red-600 hover:underline" onClick={() => removeStavka.mutate({ stavkaId: s.id })}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Add stavka inline (no-print) */}
        <div className="no-print mt-3 grid grid-cols-7 gap-1 text-xs">
          <input className="rounded border px-2 py-1" placeholder="Garažni br." value={garazniBroj} onChange={(e) => setGaraznibroj(e.target.value)} />
          <input className="rounded border px-2 py-1" placeholder="Garaža" value={garaza} onChange={(e) => setGaraza(e.target.value)} />
          <input className="rounded border px-2 py-1" placeholder="Linija" value={linija} onChange={(e) => setLinija(e.target.value)} />
          <input className="rounded border px-2 py-1" placeholder="Tip vozila" value={tipVozila} onChange={(e) => setTipVozila(e.target.value)} />
          <input className="rounded border px-2 py-1" placeholder="Šifra (1+8)" value={sifra} onChange={(e) => setSifra(e.target.value)} />
          <Button size="sm" className="col-span-2" onClick={() => {
            addStavka.mutate({ nalogId: id, garazniBroj: garazniBroj || undefined, garaza: garaza || undefined, linija: linija || undefined, tipVozila: tipVozila || undefined, sifraRasporeda: sifra || undefined });
            setGaraznibroj(""); setGaraza(""); setLinija(""); setTipVozila(""); setSifra("");
          }}>+ Dodaj stavku</Button>
        </div>

        <section className="mt-12 grid grid-cols-3 gap-8 text-xs">
          <div className="border-t-2 border-gray-400 pt-2 text-center">
            <div className="font-semibold">Logistika</div>
            <div className="mt-4 h-8"></div>
            <div className="text-[10px] text-gray-500">Datum + potpis</div>
          </div>
          <div className="border-t-2 border-gray-400 pt-2 text-center">
            <div className="font-semibold">Vođa montaže</div>
            <div className="mt-4 h-8"></div>
            <div className="text-[10px] text-gray-500">Datum + potpis</div>
          </div>
          <div className="border-t-2 border-gray-400 pt-2 text-center">
            <div className="font-semibold">Završeno</div>
            <div className="mt-4 h-8"></div>
            <div className="text-[10px] text-gray-500">Datum + potpis</div>
          </div>
        </section>

        <footer className="mt-8 border-t pt-3 text-center text-[9px] text-gray-500">
          Generisano: {new Date().toLocaleString("sr-Latn")} · Info Media Group d.o.o.
        </footer>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          aside { display: none !important; }
          main { padding: 0 !important; }
          @page { size: A4; margin: 1.2cm; }
        }
      `}</style>
    </div>
  );
}

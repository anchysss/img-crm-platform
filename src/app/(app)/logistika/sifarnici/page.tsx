"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";

type Tab = "paketi" | "folije" | "dorade" | "masine" | "montazeri" | "putni";

const TABS: { id: Tab; label: string }[] = [
  { id: "paketi", label: "Paketi vozila (30)" },
  { id: "folije", label: "Folije" },
  { id: "dorade", label: "Dorada" },
  { id: "masine", label: "Mašine" },
  { id: "montazeri", label: "Montažeri" },
  { id: "putni", label: "Putni troškovi" },
];

export default function SifarniciPage() {
  const [tab, setTab] = useState<Tab>("paketi");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Šifarnici logistike</h1>
        <p className="text-sm text-muted-foreground">
          Predefinisane vrednosti koje se koriste u nalozima za štampu, montažu i postbrending izveštaje.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-sm font-medium ${
              tab === t.id ? "border-b-2 border-red-700 text-red-700" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "paketi" && <PaketiTab />}
      {tab === "folije" && <FolijeTab />}
      {tab === "dorade" && <DoradeTab />}
      {tab === "masine" && <MasineTab />}
      {tab === "montazeri" && <MontazeriTab />}
      {tab === "putni" && <PutniTab />}
    </div>
  );
}

// ---------- PAKETI ----------
function PaketiTab() {
  const { data, refetch, isLoading } = trpc.logistikaLookups.paketi.list.useQuery();
  const upsert = trpc.logistikaLookups.paketi.upsert.useMutation({ onSuccess: () => refetch() });
  const remove = trpc.logistikaLookups.paketi.remove.useMutation({ onSuccess: () => refetch() });
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ kod: "", naziv: "", brojVozila: 5, sastav: "" });

  if (isLoading) return <p className="text-sm text-muted-foreground">Učitavam…</p>;

  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-white p-3">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
          <input className="rounded border px-2 py-1.5 text-sm" placeholder="kod (PAKET_5_VOZ_X)" value={form.kod} onChange={(e) => setForm({ ...form, kod: e.target.value })} />
          <input className="rounded border px-2 py-1.5 text-sm" placeholder="naziv (5 Vozila - Paket X)" value={form.naziv} onChange={(e) => setForm({ ...form, naziv: e.target.value })} />
          <input type="number" className="rounded border px-2 py-1.5 text-sm" placeholder="broj vozila" value={form.brojVozila} onChange={(e) => setForm({ ...form, brojVozila: Number(e.target.value) })} />
          <input className="rounded border px-2 py-1.5 text-sm md:col-span-2" placeholder="sastav (1×KT4, 2×solo bus...)" value={form.sastav} onChange={(e) => setForm({ ...form, sastav: e.target.value })} />
        </div>
        <div className="mt-2">
          <Button size="sm" disabled={!form.kod || !form.naziv} onClick={() => {
            upsert.mutate({ ...(editId ? { id: editId } : {}), ...form });
            setEditId(null); setForm({ kod: "", naziv: "", brojVozila: 5, sastav: "" });
          }}>{editId ? "Sačuvaj" : "+ Dodaj paket"}</Button>
          {editId && <Button size="sm" variant="outline" className="ml-2" onClick={() => { setEditId(null); setForm({ kod: "", naziv: "", brojVozila: 5, sastav: "" }); }}>Otkaži</Button>}
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border bg-white">
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="border-b px-2 py-2 text-left">Kod</th>
              <th className="border-b px-2 py-2 text-left">Naziv</th>
              <th className="border-b px-2 py-2 text-right">Vozila</th>
              <th className="border-b px-2 py-2 text-left">Sastav</th>
              <th className="border-b px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {data?.map((p: any) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="border-b px-2 py-1.5 font-mono">{p.kod}</td>
                <td className="border-b px-2 py-1.5 font-semibold">{p.naziv}</td>
                <td className="border-b px-2 py-1.5 text-right">{p.brojVozila}</td>
                <td className="border-b px-2 py-1.5">{p.sastav}</td>
                <td className="border-b px-2 py-1.5 text-right">
                  <button className="mr-2 text-red-700 hover:underline" onClick={() => { setEditId(p.id); setForm({ kod: p.kod, naziv: p.naziv, brojVozila: p.brojVozila, sastav: p.sastav }); }}>edit</button>
                  <button className="text-red-600 hover:underline" onClick={() => { if (confirm(`Obriši ${p.naziv}?`)) remove.mutate({ id: p.id }); }}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Generic simple lookup tab (kod + naziv) ----------
function SimpleLookupTab({ data, isLoading, onUpsert, onRemove, label }: { data: any[] | undefined; isLoading: boolean; onUpsert: (v: any) => void; onRemove: (id: string) => void; label: string }) {
  const [editId, setEditId] = useState<string | null>(null);
  const [kod, setKod] = useState("");
  const [naziv, setNaziv] = useState("");

  if (isLoading) return <p className="text-sm text-muted-foreground">Učitavam…</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 rounded-md border bg-white p-3">
        <input className="rounded border px-2 py-1.5 text-sm" placeholder="kod (npr. AVERY_3001)" value={kod} onChange={(e) => setKod(e.target.value)} />
        <input className="rounded border px-2 py-1.5 text-sm" placeholder="naziv" value={naziv} onChange={(e) => setNaziv(e.target.value)} />
        <Button size="sm" disabled={!kod || !naziv} onClick={() => {
          onUpsert({ ...(editId ? { id: editId } : {}), kod, naziv });
          setEditId(null); setKod(""); setNaziv("");
        }}>{editId ? "Sačuvaj" : `+ Dodaj ${label}`}</Button>
        {editId && <Button size="sm" variant="outline" onClick={() => { setEditId(null); setKod(""); setNaziv(""); }}>Otkaži</Button>}
      </div>
      <div className="overflow-x-auto rounded-md border bg-white">
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="border-b px-2 py-2 text-left">Kod</th>
              <th className="border-b px-2 py-2 text-left">Naziv</th>
              <th className="border-b px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {data?.map((d) => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="border-b px-2 py-1.5 font-mono">{d.kod}</td>
                <td className="border-b px-2 py-1.5 font-semibold">{d.naziv}</td>
                <td className="border-b px-2 py-1.5 text-right">
                  <button className="mr-2 text-red-700 hover:underline" onClick={() => { setEditId(d.id); setKod(d.kod); setNaziv(d.naziv); }}>edit</button>
                  <button className="text-red-600 hover:underline" onClick={() => { if (confirm(`Obriši ${d.naziv}?`)) onRemove(d.id); }}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FolijeTab() {
  const q = trpc.logistikaLookups.folije.list.useQuery();
  const u = trpc.logistikaLookups.folije.upsert.useMutation({ onSuccess: () => q.refetch() });
  const r = trpc.logistikaLookups.folije.remove.useMutation({ onSuccess: () => q.refetch() });
  return <SimpleLookupTab data={q.data} isLoading={q.isLoading} onUpsert={(v) => u.mutate(v)} onRemove={(id) => r.mutate({ id })} label="folija" />;
}
function DoradeTab() {
  const q = trpc.logistikaLookups.dorade.list.useQuery();
  const u = trpc.logistikaLookups.dorade.upsert.useMutation({ onSuccess: () => q.refetch() });
  const r = trpc.logistikaLookups.dorade.remove.useMutation({ onSuccess: () => q.refetch() });
  return <SimpleLookupTab data={q.data} isLoading={q.isLoading} onUpsert={(v) => u.mutate(v)} onRemove={(id) => r.mutate({ id })} label="dorada" />;
}
function MasineTab() {
  const q = trpc.logistikaLookups.masine.list.useQuery();
  const u = trpc.logistikaLookups.masine.upsert.useMutation({ onSuccess: () => q.refetch() });
  const r = trpc.logistikaLookups.masine.remove.useMutation({ onSuccess: () => q.refetch() });
  return <SimpleLookupTab data={q.data} isLoading={q.isLoading} onUpsert={(v) => u.mutate(v)} onRemove={(id) => r.mutate({ id })} label="mašina" />;
}

// ---------- MONTAŽERI ----------
function MontazeriTab() {
  const q = trpc.logistikaLookups.montazeri.list.useQuery();
  const u = trpc.logistikaLookups.montazeri.upsert.useMutation({ onSuccess: () => q.refetch() });
  const r = trpc.logistikaLookups.montazeri.remove.useMutation({ onSuccess: () => q.refetch() });
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ naziv: "", kontakt: "", email: "", telefon: "" });

  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-white p-3">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <input className="rounded border px-2 py-1.5 text-sm" placeholder="naziv (BUS BRANDING)" value={form.naziv} onChange={(e) => setForm({ ...form, naziv: e.target.value })} />
          <input className="rounded border px-2 py-1.5 text-sm" placeholder="kontakt osoba" value={form.kontakt} onChange={(e) => setForm({ ...form, kontakt: e.target.value })} />
          <input className="rounded border px-2 py-1.5 text-sm" placeholder="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="rounded border px-2 py-1.5 text-sm" placeholder="telefon" value={form.telefon} onChange={(e) => setForm({ ...form, telefon: e.target.value })} />
        </div>
        <div className="mt-2">
          <Button size="sm" disabled={!form.naziv} onClick={() => {
            u.mutate({ ...(editId ? { id: editId } : {}), ...form });
            setEditId(null); setForm({ naziv: "", kontakt: "", email: "", telefon: "" });
          }}>{editId ? "Sačuvaj" : "+ Dodaj montažera"}</Button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-md border bg-white">
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="border-b px-2 py-2 text-left">Naziv</th>
              <th className="border-b px-2 py-2 text-left">Kontakt</th>
              <th className="border-b px-2 py-2 text-left">Email</th>
              <th className="border-b px-2 py-2 text-left">Telefon</th>
              <th className="border-b px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {q.data?.map((m: any) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="border-b px-2 py-1.5 font-semibold">{m.naziv}</td>
                <td className="border-b px-2 py-1.5">{m.kontakt ?? "—"}</td>
                <td className="border-b px-2 py-1.5">{m.email ?? "—"}</td>
                <td className="border-b px-2 py-1.5">{m.telefon ?? "—"}</td>
                <td className="border-b px-2 py-1.5 text-right">
                  <button className="mr-2 text-red-700 hover:underline" onClick={() => { setEditId(m.id); setForm({ naziv: m.naziv, kontakt: m.kontakt ?? "", email: m.email ?? "", telefon: m.telefon ?? "" }); }}>edit</button>
                  <button className="text-red-600 hover:underline" onClick={() => { if (confirm(`Obriši ${m.naziv}?`)) r.mutate({ id: m.id }); }}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- PUTNI ----------
function PutniTab() {
  const q = trpc.logistikaLookups.putniTroskovi.list.useQuery();
  const u = trpc.logistikaLookups.putniTroskovi.upsert.useMutation({ onSuccess: () => q.refetch() });
  const r = trpc.logistikaLookups.putniTroskovi.remove.useMutation({ onSuccess: () => q.refetch() });
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ gradOd: "BG", gradDo: "", kmJedanSmer: 0, cenaUkupno: 0, valuta: "RSD" });

  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-white p-3">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
          <input className="rounded border px-2 py-1.5 text-sm" placeholder="grad od (BG)" value={form.gradOd} onChange={(e) => setForm({ ...form, gradOd: e.target.value })} />
          <input className="rounded border px-2 py-1.5 text-sm" placeholder="grad do (NS)" value={form.gradDo} onChange={(e) => setForm({ ...form, gradDo: e.target.value })} />
          <input type="number" className="rounded border px-2 py-1.5 text-sm" placeholder="km" value={form.kmJedanSmer} onChange={(e) => setForm({ ...form, kmJedanSmer: Number(e.target.value) })} />
          <input type="number" className="rounded border px-2 py-1.5 text-sm" placeholder="cena ukupno" value={form.cenaUkupno} onChange={(e) => setForm({ ...form, cenaUkupno: Number(e.target.value) })} />
          <input className="rounded border px-2 py-1.5 text-sm" placeholder="valuta" value={form.valuta} onChange={(e) => setForm({ ...form, valuta: e.target.value })} />
        </div>
        <div className="mt-2">
          <Button size="sm" disabled={!form.gradOd || !form.gradDo} onClick={() => {
            u.mutate({ ...(editId ? { id: editId } : {}), ...form });
            setEditId(null); setForm({ gradOd: "BG", gradDo: "", kmJedanSmer: 0, cenaUkupno: 0, valuta: "RSD" });
          }}>{editId ? "Sačuvaj" : "+ Dodaj relaciju"}</Button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-md border bg-white">
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="border-b px-2 py-2 text-left">Od</th>
              <th className="border-b px-2 py-2 text-left">Do</th>
              <th className="border-b px-2 py-2 text-right">Km (1 smer)</th>
              <th className="border-b px-2 py-2 text-right">Cena (povratno)</th>
              <th className="border-b px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {q.data?.map((p: any) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="border-b px-2 py-1.5 font-mono">{p.gradOd}</td>
                <td className="border-b px-2 py-1.5 font-mono">{p.gradDo}</td>
                <td className="border-b px-2 py-1.5 text-right">{p.kmJedanSmer}</td>
                <td className="border-b px-2 py-1.5 text-right">{Number(p.cenaUkupno).toLocaleString("sr-Latn")} {p.valuta}</td>
                <td className="border-b px-2 py-1.5 text-right">
                  <button className="mr-2 text-red-700 hover:underline" onClick={() => { setEditId(p.id); setForm({ gradOd: p.gradOd, gradDo: p.gradDo, kmJedanSmer: p.kmJedanSmer, cenaUkupno: Number(p.cenaUkupno), valuta: p.valuta }); }}>edit</button>
                  <button className="text-red-600 hover:underline" onClick={() => { if (confirm("Obriši?")) r.mutate({ id: p.id }); }}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

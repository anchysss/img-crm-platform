"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";

const RN_TONE: Record<string, any> = {
  NOVO: "warning",
  PRIHVACEN_LOGISTIKA: "info",
  PRIPREMA_FAJLOVA: "warning",
  KOLORNA_PROBA: "warning",
  PROBA_ODOBRENA: "info",
  PRIPREMA_MONTAZE: "info",
  U_REALIZACIJI: "info",
  STAMPA_U_TOKU: "info",
  MONTAZA_U_TOKU: "info",
  ZAVRSEN: "success",
  OTKAZAN: "danger",
};

const STAVKA_TONE: Record<string, any> = {
  NACRT: "warning",
  POSLATO: "info",
  POSTAVLJENO: "success",
  PROBLEM: "danger",
  OTKAZANO: "danger",
};

type Tab = "rn" | "stampa" | "montaza";

export default function RadniNaloziPage() {
  const [tab, setTab] = useState<Tab>("rn");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Radni nalozi</h1>

      <div className="flex flex-wrap gap-1 border-b">
        <TabBtn active={tab === "rn"} onClick={() => setTab("rn")} label="📋 Iz prodaje" />
        <TabBtn active={tab === "stampa"} onClick={() => setTab("stampa")} label="🖨️ Nalozi za štampu" />
        <TabBtn active={tab === "montaza"} onClick={() => setTab("montaza")} label="🔧 Nalozi za montažu" />
      </div>

      {tab === "rn" && <RadniNaloziTab />}
      {tab === "stampa" && <NaloziStampuTab />}
      {tab === "montaza" && <NaloziMontazuTab />}
    </div>
  );
}

function TabBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium ${
        active ? "border-b-2 border-red-700 text-red-700" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

// ============== RADNI NALOZI (iz prodaje) ==============
function RadniNaloziTab() {
  const { data, isLoading } = trpc.radniNalozi.list.useQuery();
  if (isLoading) return <p className="text-sm text-muted-foreground">Učitavam…</p>;
  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-secondary/60 text-left">
          <tr>
            <th className="px-3 py-2">Broj</th>
            <th className="px-3 py-2">Period</th>
            <th className="px-3 py-2">Grad</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Napomena</th>
          </tr>
        </thead>
        <tbody>
          {(data ?? []).length === 0 && (
            <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Nema radnih naloga. Kreiraju se automatski kad ponuda pređe u PRIHVACENA.</td></tr>
          )}
          {(data ?? []).map((rn: any) => (
            <tr key={rn.id} className="border-t hover:bg-secondary/20">
              <td className="px-3 py-2 font-mono">
                <Link href={`/logistika/radni-nalozi/${rn.id}`} className="hover:underline">{rn.broj}</Link>
              </td>
              <td className="px-3 py-2">{formatDate(rn.odDatum)} — {formatDate(rn.doDatum)}</td>
              <td className="px-3 py-2">{rn.grad ?? "—"}</td>
              <td className="px-3 py-2"><Badge variant={RN_TONE[rn.status]}>{rn.status.replace(/_/g, " ")}</Badge></td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{rn.napomena ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============== NALOZI ZA ŠTAMPU ==============
function NaloziStampuTab() {
  const router = useRouter();
  const { data, isLoading, refetch } = trpc.nalogStampu.list.useQuery();
  const [showCreate, setShowCreate] = useState(false);
  const setStatus = trpc.nalogStampu.setStatus.useMutation({ onSuccess: () => refetch() });
  const remove = trpc.nalogStampu.remove.useMutation({ onSuccess: () => refetch() });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between">
        <p className="text-xs text-muted-foreground">Nalozi za štampu — kolorna proba (PROBNA) ili produkciona (REDOVNA)</p>
        <Button size="sm" onClick={() => setShowCreate(true)}>+ Novi nalog za štampu</Button>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Učitavam…</p> : (
        <div className="overflow-hidden rounded-md border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left">
              <tr>
                <th className="px-3 py-2">Broj</th>
                <th className="px-3 py-2">Tip</th>
                <th className="px-3 py-2">Štamparija</th>
                <th className="px-3 py-2">Datum predaje</th>
                <th className="px-3 py-2">Rok</th>
                <th className="px-3 py-2 text-right">Stavki</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Akcije</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).length === 0 && (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">Nema naloga za štampu. Klikni &quot;+ Novi nalog za štampu&quot;.</td></tr>
              )}
              {(data ?? []).map((n: any) => (
                <tr key={n.id} className="border-t hover:bg-secondary/20">
                  <td className="px-3 py-2 font-mono">
                    <Link href={`/logistika/nalog-stampu/${n.id}`} className="hover:underline">{n.broj}</Link>
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={n.tipStampe === "PROBNA" ? "warning" : "info"}>
                      {n.tipStampe === "PROBNA" ? "PROBNA" : "REDOVNA"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-xs">{n.stamparija}</td>
                  <td className="px-3 py-2 text-xs">{formatDate(n.datumPredaje)}</td>
                  <td className="px-3 py-2 text-xs">{formatDate(n.rokIzrade)} {n.rokIzradeTime ?? ""}</td>
                  <td className="px-3 py-2 text-right">{n._count?.stavke ?? 0}</td>
                  <td className="px-3 py-2"><Badge variant={STAVKA_TONE[n.status]}>{n.status}</Badge></td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" title="Otvori / Edit" onClick={() => router.push(`/logistika/nalog-stampu/${n.id}`)}>✏️</Button>
                      {n.status === "NACRT" && (
                        <Button size="sm" variant="outline" title="Pošalji štampariji" onClick={() => setStatus.mutate({ id: n.id, status: "POSLATO" })}>📨</Button>
                      )}
                      {n.status === "POSLATO" && (
                        <Button size="sm" variant="outline" title="Označi završeno" onClick={() => setStatus.mutate({ id: n.id, status: "POSTAVLJENO" })}>✓</Button>
                      )}
                      <Button size="sm" variant="outline" title="Obriši" onClick={() => { if (confirm(`Obrisati nalog ${n.broj}?`)) remove.mutate({ id: n.id }); }}>🗑</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <NalogStampuCreateDialog onClose={() => { setShowCreate(false); refetch(); }} />}
    </div>
  );
}

// ============== NALOZI ZA MONTAŽU ==============
function NaloziMontazuTab() {
  const router = useRouter();
  const { data, isLoading, refetch } = trpc.nalogMontazu.list.useQuery();
  const [showCreate, setShowCreate] = useState(false);
  const setStatus = trpc.nalogMontazu.setStatus.useMutation({ onSuccess: () => refetch() });
  const remove = trpc.nalogMontazu.remove.useMutation({ onSuccess: () => refetch() });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between">
        <p className="text-xs text-muted-foreground">Nalozi za montažu — Beograd ili po gradovima</p>
        <Button size="sm" onClick={() => setShowCreate(true)}>+ Novi nalog za montažu</Button>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Učitavam…</p> : (
        <div className="overflow-hidden rounded-md border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left">
              <tr>
                <th className="px-3 py-2">Broj</th>
                <th className="px-3 py-2">Tip</th>
                <th className="px-3 py-2">Grad</th>
                <th className="px-3 py-2">Datum montaže</th>
                <th className="px-3 py-2 text-right">Stavki</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Akcije</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).length === 0 && (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">Nema naloga za montažu. Klikni &quot;+ Novi nalog za montažu&quot;.</td></tr>
              )}
              {(data ?? []).map((n: any) => (
                <tr key={n.id} className="border-t hover:bg-secondary/20">
                  <td className="px-3 py-2 font-mono">
                    <Link href={`/logistika/nalog-montazu/${n.id}`} className="hover:underline">{n.broj}</Link>
                  </td>
                  <td className="px-3 py-2 text-xs">{n.tip}</td>
                  <td className="px-3 py-2 text-xs">{n.grad ?? "—"}</td>
                  <td className="px-3 py-2 text-xs">{n.datumMontaze ? formatDate(n.datumMontaze) : "—"}</td>
                  <td className="px-3 py-2 text-right">{n._count?.stavke ?? 0}</td>
                  <td className="px-3 py-2"><Badge variant={STAVKA_TONE[n.status]}>{n.status}</Badge></td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" title="Otvori / Edit" onClick={() => router.push(`/logistika/nalog-montazu/${n.id}`)}>✏️</Button>
                      {n.status === "NACRT" && (
                        <Button size="sm" variant="outline" title="Pošalji ekipi" onClick={() => setStatus.mutate({ id: n.id, status: "POSLATO" })}>📨</Button>
                      )}
                      {n.status === "POSLATO" && (
                        <Button size="sm" variant="outline" title="Označi postavljeno" onClick={() => setStatus.mutate({ id: n.id, status: "POSTAVLJENO" })}>✓</Button>
                      )}
                      <Button size="sm" variant="outline" title="Obriši" onClick={() => { if (confirm(`Obrisati nalog ${n.broj}?`)) remove.mutate({ id: n.id }); }}>🗑</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <NalogMontazuCreateDialog onClose={() => { setShowCreate(false); refetch(); }} />}
    </div>
  );
}

// ============== CREATE DIALOG: nalog za štampu ==============
function NalogStampuCreateDialog({ onClose }: { onClose: () => void }) {
  const radniNalozi = trpc.radniNalozi.list.useQuery();
  const create = trpc.nalogStampu.create.useMutation({
    onSuccess: () => onClose(),
  });
  const [form, setForm] = useState({
    radniNalogId: "",
    tipStampe: "REDOVNA" as "PROBNA" | "REDOVNA",
    stamparija: "DPC_BEOGRAD" as "DPC_BEOGRAD" | "STAMPARIJA_NIS" | "DRUGA",
    datumPredaje: new Date().toISOString().slice(0, 10),
    rokIzrade: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    kampanjaNaziv: "",
    napomena: "",
  });
  const [err, setErr] = useState<string | null>(null);

  // Auto-populate iz RN-a kad se izabere
  const rnDetail = trpc.radniNalozi.byId.useQuery(
    { id: form.radniNalogId },
    { enabled: Boolean(form.radniNalogId) },
  );
  // Kad fetch RN-a stigne, popuni kampanjaNaziv ako nije setovan
  if (rnDetail.data && form.radniNalogId === rnDetail.data.id && !form.kampanjaNaziv) {
    const rn: any = rnDetail.data;
    const partnerNaziv = rn.partner?.naziv ?? "";
    const period = rn.odDatum ? new Date(rn.odDatum).toLocaleDateString("sr-Latn") : "";
    setTimeout(() => setForm((f) => ({
      ...f,
      kampanjaNaziv: partnerNaziv ? `${partnerNaziv} — ${rn.broj}` : f.kampanjaNaziv,
      napomena: f.napomena || (period ? `RN ${rn.broj} · ${partnerNaziv} · od ${period}` : ""),
    })), 0);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    create.mutateAsync({
      radniNalogId: form.radniNalogId,
      tipStampe: form.tipStampe as any,
      stamparija: form.stamparija as any,
      datumPredaje: new Date(form.datumPredaje),
      rokIzrade: new Date(form.rokIzrade),
      kampanjaNaziv: form.kampanjaNaziv || undefined,
      napomena: form.napomena || undefined,
    }).catch((e: any) => setErr(e.message));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <div className="my-8 w-full max-w-xl rounded-lg bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold">Novi nalog za štampu</h2>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Field label="Radni nalog *">
              <Select required value={form.radniNalogId} onChange={(e) => setForm({ ...form, radniNalogId: e.target.value })}>
                <option value="">— izaberi RN —</option>
                {(radniNalozi.data ?? []).map((rn: any) => (
                  <option key={rn.id} value={rn.id}>{rn.broj} ({rn.status.replace(/_/g, " ")})</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Tip štampe *">
            <Select required value={form.tipStampe} onChange={(e) => {
              const tip = e.target.value as "PROBNA" | "REDOVNA";
              const days = tip === "PROBNA" ? 1 : 3;
              setForm({ ...form, tipStampe: tip, rokIzrade: new Date(Date.now() + days * 86400000).toISOString().slice(0, 10) });
            }}>
              <option value="REDOVNA">REDOVNA (produkcija)</option>
              <option value="PROBNA">PROBNA (kolorna proba)</option>
            </Select>
          </Field>
          <Field label="Štamparija *">
            <Select required value={form.stamparija} onChange={(e) => setForm({ ...form, stamparija: e.target.value as any })}>
              <option value="DPC_BEOGRAD">DPC Beograd</option>
              <option value="STAMPARIJA_NIS">Štamparija Niš</option>
              <option value="DRUGA">Druga</option>
            </Select>
          </Field>
          <Field label="Datum predaje *"><Input type="date" required value={form.datumPredaje} onChange={(e) => setForm({ ...form, datumPredaje: e.target.value })} /></Field>
          <Field label="Rok izrade *"><Input type="date" required value={form.rokIzrade} onChange={(e) => setForm({ ...form, rokIzrade: e.target.value })} /></Field>
          <div className="col-span-2">
            <Field label="Naziv kampanje (opciono)">
              <Input value={form.kampanjaNaziv} onChange={(e) => setForm({ ...form, kampanjaNaziv: e.target.value })} placeholder="FAIRY HIGER - 2 kom" />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Napomena">
              <Input value={form.napomena} onChange={(e) => setForm({ ...form, napomena: e.target.value })} />
            </Field>
          </div>
          {err && <p className="col-span-2 text-sm text-destructive">{err}</p>}
          <div className="col-span-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Otkaži</Button>
            <Button type="submit" disabled={create.isPending || !form.radniNalogId}>
              {create.isPending ? "Čuvam…" : "Kreiraj"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============== CREATE DIALOG: nalog za montažu ==============
function NalogMontazuCreateDialog({ onClose }: { onClose: () => void }) {
  const radniNalozi = trpc.radniNalozi.list.useQuery();
  const montazeri = trpc.logistikaLookups.montazeri.list.useQuery();
  const create = trpc.nalogMontazu.create.useMutation({ onSuccess: () => onClose() });
  const [form, setForm] = useState({
    radniNalogId: "",
    tip: "BEOGRAD" as "BEOGRAD" | "GRADOVI",
    grad: "",
    montazerId: "",
    prevoznikNaziv: "",
    datumMontaze: new Date().toISOString().slice(0, 10),
    napomena: "",
  });
  const [err, setErr] = useState<string | null>(null);

  // Auto-populate iz RN-a (klijent + period u napomeni, grad iz RN.grad)
  const rnDetail = trpc.radniNalozi.byId.useQuery(
    { id: form.radniNalogId },
    { enabled: Boolean(form.radniNalogId) },
  );
  if (rnDetail.data && form.radniNalogId === rnDetail.data.id && !form.napomena) {
    const rn: any = rnDetail.data;
    const partnerNaziv = rn.partner?.naziv ?? "";
    const period = rn.odDatum ? `${new Date(rn.odDatum).toLocaleDateString("sr-Latn")} — ${new Date(rn.doDatum).toLocaleDateString("sr-Latn")}` : "";
    setTimeout(() => setForm((f) => ({
      ...f,
      grad: f.grad || rn.grad || "",
      napomena: f.napomena || (partnerNaziv ? `RN ${rn.broj} · ${partnerNaziv} · ${period}` : ""),
    })), 0);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    create.mutateAsync({
      radniNalogId: form.radniNalogId,
      tip: form.tip as any,
      grad: form.tip === "GRADOVI" ? (form.grad || undefined) : undefined,
      montazerId: form.montazerId || undefined,
      prevoznikNaziv: form.prevoznikNaziv || undefined,
      datumMontaze: form.datumMontaze ? new Date(form.datumMontaze) : undefined,
      napomena: form.napomena || undefined,
    } as any).catch((e: any) => setErr(e.message));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <div className="my-8 w-full max-w-xl rounded-lg bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold">Novi nalog za montažu</h2>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Field label="Radni nalog *">
              <Select required value={form.radniNalogId} onChange={(e) => setForm({ ...form, radniNalogId: e.target.value })}>
                <option value="">— izaberi RN —</option>
                {(radniNalozi.data ?? []).map((rn: any) => (
                  <option key={rn.id} value={rn.id}>{rn.broj} ({rn.status.replace(/_/g, " ")})</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Tip *">
            <Select required value={form.tip} onChange={(e) => setForm({ ...form, tip: e.target.value as any })}>
              <option value="BEOGRAD">Beograd</option>
              <option value="GRADOVI">Ostali gradovi</option>
            </Select>
          </Field>
          {form.tip === "GRADOVI" && (
            <Field label="Grad *">
              <Input required value={form.grad} onChange={(e) => setForm({ ...form, grad: e.target.value })} placeholder="Niš / Novi Sad / …" />
            </Field>
          )}
          <Field label="Montažer">
            <Select value={form.montazerId} onChange={(e) => setForm({ ...form, montazerId: e.target.value })}>
              <option value="">— izaberi —</option>
              {(montazeri.data ?? []).map((m: any) => <option key={m.id} value={m.id}>{m.naziv}</option>)}
            </Select>
          </Field>
          <Field label="Prevoznik">
            <Input value={form.prevoznikNaziv} onChange={(e) => setForm({ ...form, prevoznikNaziv: e.target.value })} placeholder="Niš ekspres / GSP Beograd…" />
          </Field>
          <Field label="Datum montaže">
            <Input type="date" value={form.datumMontaze} onChange={(e) => setForm({ ...form, datumMontaze: e.target.value })} />
          </Field>
          <div className="col-span-2">
            <Field label="Napomena">
              <Input value={form.napomena} onChange={(e) => setForm({ ...form, napomena: e.target.value })} />
            </Field>
          </div>
          {err && <p className="col-span-2 text-sm text-destructive">{err}</p>}
          <div className="col-span-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Otkaži</Button>
            <Button type="submit" disabled={create.isPending || !form.radniNalogId || (form.tip === "GRADOVI" && !form.grad)}>
              {create.isPending ? "Čuvam…" : "Kreiraj"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

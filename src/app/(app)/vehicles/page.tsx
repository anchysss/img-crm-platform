"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/lib/use-tenant";
import { downloadCsv, downloadXlsx } from "@/lib/export";
import { TIP_OGLASA_GROUPS, TIP_OGLASA_LABEL } from "@/lib/tip-oglasa";

const STATUS_TONE: Record<string, any> = {
  AKTIVNO: "success",
  U_ZAKUPU: "info",
  SERVIS: "warning",
  KVAR: "danger",
  NA_FARBANJU: "warning",
  POVUCENO: "default",
  SIHTA: "info",
};

export default function VehiclesPage() {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState({ q: "", garaza: "", dobavljac: "", status: "", tip: "" });
  const { data, isLoading, refetch } = trpc.vehicles.list.useQuery({
    q: filters.q || undefined,
    garaza: filters.garaza || undefined,
    dobavljac: filters.dobavljac || undefined,
    status: (filters.status || undefined) as any,
    tip: (filters.tip || undefined) as any,
  });
  const garazeQ = trpc.vehicles.distinctGaraza.useQuery();
  const dobavljaciQ = trpc.vehicles.distinctDobavljac.useQuery();

  function exportAll(fmt: "csv" | "xlsx") {
    const rows = (data ?? []).map((v: any) => ({
      "Šifra": v.sifra ?? "",
      "Lokacija": v.grad ?? "",
      "Prevoznik": v.dobavljac ?? "",
      "Tip vozila": v.tipVozilaTxt ?? v.tip,
      "Registarski broj": v.registracija,
      "Inventurni broj": v.inventurniBroj ?? "",
      "Oznaka": v.oznaka ?? "",
      "Garaža": v.garaza ?? "",
      "Linija": (v.linija ?? []).join(" | "),
      "Od": v.zakupOd ? new Date(v.zakupOd).toISOString().slice(0, 10) : "",
      "Do": v.zakupDo ? new Date(v.zakupDo).toISOString().slice(0, 10) : "",
      "Aktivan": v.aktivan ? "DA" : "NE",
      "Model": v.model ?? "",
      "GPS": v.gps ? "DA" : "NE",
      "Opis": v.opis ?? "",
      "Broj ugovora": v.brojUgovora ?? "",
      "Kom.naknada (Datum do)": v.komNaknadaDatumDo ? new Date(v.komNaknadaDatumDo).toISOString().slice(0, 10) : "",
    }));
    if (fmt === "csv") downloadCsv("vozila.csv", rows);
    else downloadXlsx("vozila.xlsx", "Vozila", rows);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Vozila</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => exportAll("csv")}>📥 CSV</Button>
          <Button variant="outline" onClick={() => exportAll("xlsx")}>📥 XLSX</Button>
          <Link href="/logistika/vozila/import" className="inline-flex items-center rounded-md border bg-background px-3 py-2 text-sm hover:bg-secondary">Bulk import</Link>
          <Button onClick={() => setOpen(true)}>+ Novo vozilo</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <Input placeholder="🔍 Reg / inv. / šifra / model" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
        <Select value={filters.garaza} onChange={(e) => setFilters({ ...filters, garaza: e.target.value })}>
          <option value="">Sve garaže</option>
          {(garazeQ.data ?? []).map((g) => <option key={g} value={g}>{g}</option>)}
        </Select>
        <Select value={filters.dobavljac} onChange={(e) => setFilters({ ...filters, dobavljac: e.target.value })}>
          <option value="">Svi prevoznici</option>
          {(dobavljaciQ.data ?? []).map((d) => <option key={d} value={d}>{d}</option>)}
        </Select>
        <Select value={filters.tip} onChange={(e) => setFilters({ ...filters, tip: e.target.value })}>
          <option value="">Svi tipovi</option>
          <option value="BUS">Autobus solo</option>
          <option value="BUS_ZGLOBNI">Autobus zglobni</option>
          <option value="MINI">Mini bus</option>
          <option value="TRAMVAJ">Tramvaj</option>
          <option value="TROLEJBUS">Trolejbus</option>
          <option value="DRUGO">Drugo</option>
        </Select>
        <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">Svi statusi</option>
          <option value="AKTIVNO">Aktivno</option>
          <option value="U_ZAKUPU">U zakupu</option>
          <option value="SERVIS">Servis</option>
          <option value="KVAR">Kvar</option>
          <option value="NA_FARBANJU">Na farbanju</option>
          <option value="POVUCENO">Povučeno / Rashod</option>
          <option value="SIHTA">Šihta</option>
        </Select>
      </div>

      {isLoading ? <p>Učitavam...</p> : (
        <div className="overflow-x-auto rounded-md border">
          <table className="min-w-full text-xs">
            <thead className="bg-secondary/60 text-left">
              <tr>
                <th className="px-2 py-2">Šifra</th>
                <th className="px-2 py-2">Lokacija</th>
                <th className="px-2 py-2">Prevoznik</th>
                <th className="px-2 py-2">Tip vozila</th>
                <th className="px-2 py-2">Reg. broj</th>
                <th className="px-2 py-2">Inv. broj</th>
                <th className="px-2 py-2">Oznaka</th>
                <th className="px-2 py-2">Garaža</th>
                <th className="px-2 py-2">Linija</th>
                <th className="px-2 py-2">Od</th>
                <th className="px-2 py-2">Do</th>
                <th className="px-2 py-2">Akt.</th>
                <th className="px-2 py-2">Model</th>
                <th className="px-2 py-2">GPS</th>
                <th className="px-2 py-2">Status / Opis</th>
                <th className="px-2 py-2">Ugovor</th>
                <th className="px-2 py-2">Brendinzi</th>
                <th className="px-2 py-2">Skice</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).length === 0 && (
                <tr><td colSpan={18} className="px-3 py-6 text-center text-muted-foreground">Nema vozila za izabrane filtere.</td></tr>
              )}
              {(data ?? []).map((v: any) => (
                <tr key={v.id} className="cursor-pointer border-t hover:bg-secondary/30" onClick={() => { window.location.href = `/logistika/vozila/${v.id}`; }}>
                  <td className="px-2 py-1 font-mono">{v.sifra ?? "—"}</td>
                  <td className="px-2 py-1">{v.grad}</td>
                  <td className="px-2 py-1">{v.dobavljac ?? "—"}</td>
                  <td className="px-2 py-1">{v.tipVozilaTxt ?? v.tip}</td>
                  <td className="px-2 py-1 font-mono font-medium text-primary hover:underline">{v.registracija}</td>
                  <td className="px-2 py-1 font-mono">{v.inventurniBroj ?? "—"}</td>
                  <td className="px-2 py-1">{v.oznaka ?? "—"}</td>
                  <td className="px-2 py-1">{v.garaza ?? "—"}</td>
                  <td className="px-2 py-1 max-w-[220px] truncate" title={(v.linija ?? []).join("; ")}>
                    {(v.linija ?? []).slice(0, 2).join("; ")}{(v.linija ?? []).length > 2 ? "..." : ""}
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap">{v.zakupOd ? new Date(v.zakupOd).toLocaleDateString("sr-Latn") : "—"}</td>
                  <td className="px-2 py-1 whitespace-nowrap">{v.zakupDo ? new Date(v.zakupDo).toLocaleDateString("sr-Latn") : "—"}</td>
                  <td className="px-2 py-1">{v.aktivan ? "✓" : "—"}</td>
                  <td className="px-2 py-1">{v.model ?? "—"}</td>
                  <td className="px-2 py-1">{v.gps ? "✓" : "—"}</td>
                  <td className="px-2 py-1"><Badge variant={STATUS_TONE[v.status]}>{v.status}</Badge>{v.opis ? <span className="ml-1 text-muted-foreground">· {v.opis}</span> : null}</td>
                  <td className="px-2 py-1">{v.brojUgovora ?? "—"}</td>
                  <td className="px-2 py-1">
                    {(v.podrzaniTipoviBrendinga ?? []).length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {(v.podrzaniTipoviBrendinga ?? []).slice(0, 3).map((t: string) => (
                          <span key={t} className="rounded bg-secondary/60 px-1.5 py-0.5 text-[9px]">{t.replace(/^OUTDOOR_/, "O.").replace(/^INDOOR_/, "I.").replace(/^DODATAK_/, "+")}</span>
                        ))}
                        {(v.podrzaniTipoviBrendinga ?? []).length > 3 && <span className="text-[9px] text-muted-foreground">+{v.podrzaniTipoviBrendinga.length - 3}</span>}
                      </div>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-2 py-1 text-center">
                    {v.skicaSpoljnaUrl && <span title="Spoljna skica">🚌</span>}
                    {v.skicaUnutrasnjaUrl && <span title="Unutrašnja skica" className="ml-1">📐</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && <VehicleCreateDialog onClose={() => { setOpen(false); refetch(); }} />}
    </div>
  );
}

function VehicleCreateDialog({ onClose }: { onClose: () => void }) {
  const tenant = useTenant();
  const mut = trpc.vehicles.create.useMutation({ onSuccess: onClose });
  const [form, setForm] = useState({
    sifra: "", dobavljac: "", tipVozilaTxt: "", registracija: "", inventurniBroj: "", oznaka: "",
    garaza: "", linija: "", zakupOd: "", zakupDo: "", aktivan: true, model: "", gps: false, opis: "", brojUgovora: "",
    skicaSpoljnaUrl: "", skicaUnutrasnjaUrl: "", routerBroj: "", kameraBroj: "",
    podrzaniTipoviBrendinga: [] as string[],
    tip: "BUS", zemlja: "", grad: "",
  });
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!form.zemlja && tenant.iso) {
      setForm((f) => ({ ...f, zemlja: tenant.iso, grad: f.grad || tenant.capital }));
    }
  }, [tenant.iso, tenant.capital, form.zemlja]);

  function toggleBrending(tip: string) {
    setForm((f) => ({
      ...f,
      podrzaniTipoviBrendinga: f.podrzaniTipoviBrendinga.includes(tip)
        ? f.podrzaniTipoviBrendinga.filter((t) => t !== tip)
        : [...f.podrzaniTipoviBrendinga, tip],
    }));
  }

  const hasDigital = form.podrzaniTipoviBrendinga.includes("INDOOR_DIGITAL");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await mut.mutateAsync({
        ...form,
        linija: form.linija ? form.linija.split(/[;|\n]/).map((s) => s.trim()).filter(Boolean) : [],
        zakupOd: form.zakupOd ? new Date(form.zakupOd) : undefined,
        zakupDo: form.zakupDo ? new Date(form.zakupDo) : undefined,
        skicaSpoljnaUrl: form.skicaSpoljnaUrl || undefined,
        skicaUnutrasnjaUrl: form.skicaUnutrasnjaUrl || undefined,
        routerBroj: form.routerBroj || undefined,
        kameraBroj: form.kameraBroj || undefined,
        podrzaniTipoviBrendinga: form.podrzaniTipoviBrendinga.length > 0 ? form.podrzaniTipoviBrendinga : undefined,
      } as any);
    } catch (e: any) { setErr(e.message); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <div className="my-8 w-full max-w-3xl rounded-lg bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold">Novo vozilo (bcMediaBox format)</h2>
        <form onSubmit={submit} className="grid grid-cols-3 gap-3">
          <Field label="Šifra"><Input value={form.sifra} onChange={(e) => setForm({ ...form, sifra: e.target.value })} /></Field>
          <Field label="Registarski broj *"><Input required value={form.registracija} onChange={(e) => setForm({ ...form, registracija: e.target.value })} /></Field>
          <Field label="Inventurni broj"><Input value={form.inventurniBroj} onChange={(e) => setForm({ ...form, inventurniBroj: e.target.value })} /></Field>

          <Field label="Prevoznik"><Input placeholder="JKP GSP BEOGRAD" value={form.dobavljac} onChange={(e) => setForm({ ...form, dobavljac: e.target.value })} /></Field>
          <Field label="Garaža"><Input placeholder="GSP Centrala / Novi Beograd / Dorćol..." value={form.garaza} onChange={(e) => setForm({ ...form, garaza: e.target.value })} /></Field>
          <Field label="Oznaka"><Input value={form.oznaka} onChange={(e) => setForm({ ...form, oznaka: e.target.value })} /></Field>

          <Field label="Tip vozila (tekst)"><Input placeholder="Tramvaj solo KT4 / Autobus zglobni..." value={form.tipVozilaTxt} onChange={(e) => setForm({ ...form, tipVozilaTxt: e.target.value })} /></Field>
          <Field label="Tip (kategorija) *">
            <Select value={form.tip} onChange={(e) => setForm({ ...form, tip: e.target.value })}>
              <option value="BUS">Autobus solo</option>
              <option value="BUS_ZGLOBNI">Autobus zglobni</option>
              <option value="MINI">Mini bus</option>
              <option value="TRAMVAJ">Tramvaj</option>
              <option value="TROLEJBUS">Trolejbus</option>
              <option value="DRUGO">Drugo</option>
            </Select>
          </Field>
          <Field label="Model"><Input placeholder="Solaris Urbino 18..." value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></Field>

          <Field label="Lokacija / Grad *"><Input required value={form.grad} onChange={(e) => setForm({ ...form, grad: e.target.value })} /></Field>
          <Field label="Zemlja (ISO2)"><Input maxLength={2} value={form.zemlja} onChange={(e) => setForm({ ...form, zemlja: e.target.value.toUpperCase() })} /></Field>
          <Field label="Aktivan"><input className="h-4 w-4" type="checkbox" checked={form.aktivan} onChange={(e) => setForm({ ...form, aktivan: e.target.checked })} /></Field>

          <div className="col-span-3">
            <Field label="Linije (razdvoj sa ; ili novim redom)">
              <Input placeholder="BG, 56 ZELENI VENAC - PETLOVO BRDO; BG, 88 ZEMUN - NOVI ŽELEZNIK" value={form.linija} onChange={(e) => setForm({ ...form, linija: e.target.value })} />
            </Field>
          </div>

          <Field label="Zakup od"><Input type="date" value={form.zakupOd} onChange={(e) => setForm({ ...form, zakupOd: e.target.value })} /></Field>
          <Field label="Zakup do"><Input type="date" value={form.zakupDo} onChange={(e) => setForm({ ...form, zakupDo: e.target.value })} /></Field>
          <Field label="Broj ugovora"><Input value={form.brojUgovora} onChange={(e) => setForm({ ...form, brojUgovora: e.target.value })} /></Field>

          <Field label="GPS"><input className="h-4 w-4" type="checkbox" checked={form.gps} onChange={(e) => setForm({ ...form, gps: e.target.checked })} /></Field>
          <div className="col-span-2"><Field label="Opis / status napomena"><Input placeholder="U ZAKUPU / neaktivan; kvar / ŠIHTA..." value={form.opis} onChange={(e) => setForm({ ...form, opis: e.target.value })} /></Field></div>

          <div className="col-span-3 mt-3 rounded-md border bg-secondary/20 p-3">
            <h3 className="mb-2 text-sm font-semibold">📐 Skice vozila</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Skica SPOLJA (URL slike)" hint="primer pozicija outdoor brendinga na karoseriji">
                <Input type="url" placeholder="https://..." value={form.skicaSpoljnaUrl} onChange={(e) => setForm({ ...form, skicaSpoljnaUrl: e.target.value })} />
              </Field>
              <Field label="Skica UNUTRA (URL slike)" hint="raspored plakata, hengeri, ručke, sedišta">
                <Input type="url" placeholder="https://..." value={form.skicaUnutrasnjaUrl} onChange={(e) => setForm({ ...form, skicaUnutrasnjaUrl: e.target.value })} />
              </Field>
            </div>
          </div>

          <div className="col-span-3 mt-2 rounded-md border bg-secondary/20 p-3">
            <h3 className="mb-2 text-sm font-semibold">🎨 Tipovi brendinga koje vozilo PODRŽAVA</h3>
            <p className="mb-2 text-xs text-muted-foreground">Označi sve formate koji se mogu raditi na ovom vozilu — ovo se koristi u ponudi za prodaju.</p>
            {TIP_OGLASA_GROUPS.map((g) => (
              <div key={g.label} className="mt-2">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{g.label}</div>
                <div className="flex flex-wrap gap-2">
                  {g.values.map((t) => (
                    <label key={t} className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${form.podrzaniTipoviBrendinga.includes(t) ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-secondary"}`}>
                      <input type="checkbox" className="h-3 w-3" checked={form.podrzaniTipoviBrendinga.includes(t)} onChange={() => toggleBrending(t)} />
                      {TIP_OGLASA_LABEL[t]?.replace(/^[A-Z]+ — /, "") ?? t}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {hasDigital && (
            <div className="col-span-3 mt-2 rounded-md border bg-amber-50 dark:bg-amber-950/20 p-3">
              <h3 className="mb-2 text-sm font-semibold">📡 Digital — router & kamera</h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Router (serijski / inventarni broj)" hint="broj routera za digital ekran">
                  <Input value={form.routerBroj} onChange={(e) => setForm({ ...form, routerBroj: e.target.value })} />
                </Field>
                <Field label="Kamera (serijski / inventarni broj)">
                  <Input value={form.kameraBroj} onChange={(e) => setForm({ ...form, kameraBroj: e.target.value })} />
                </Field>
              </div>
            </div>
          )}

          {err && <p className="col-span-3 text-sm text-destructive">{err}</p>}
          <div className="col-span-3 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Otkaži</Button>
            <Button type="submit" disabled={mut.isPending}>Sačuvaj</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

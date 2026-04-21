"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function AdminUsersPage() {
  const { data, refetch } = trpc.users.list.useQuery();
  const pravnaLica = trpc.lookups.pravnaLica.useQuery();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Korisnici</h1>
        <Button onClick={() => setOpen(true)}>+ Novi korisnik</Button>
      </div>
      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left">
            <tr>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Ime</th>
              <th className="px-3 py-2">Aktivan</th>
              <th className="px-3 py-2">2FA</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((u: any) => (
              <UserRow key={u.id} user={u} onChange={refetch} />
            ))}
          </tbody>
        </table>
      </div>

      {open && <UserCreateDialog onClose={() => { setOpen(false); refetch(); }} pravnaLica={pravnaLica.data ?? []} />}
    </div>
  );
}

function UserRow({ user, onChange }: { user: any; onChange: () => void }) {
  const setActive = trpc.users.setActive.useMutation({ onSuccess: onChange });
  const reset = trpc.users.resetPassword.useMutation({ onSuccess: onChange });
  const disableTwoFa = trpc.users.disableTwoFa.useMutation({ onSuccess: onChange });
  return (
    <tr className="border-t">
      <td className="px-3 py-2 font-mono">{user.email}</td>
      <td className="px-3 py-2">{user.ime} {user.prezime}</td>
      <td className="px-3 py-2">
        <input type="checkbox" checked={user.aktivan} onChange={(e) => setActive.mutate({ id: user.id, aktivan: e.target.checked })} />
      </td>
      <td className="px-3 py-2">
        {user.twoFaEnabled ? (
          <div className="flex items-center gap-2">
            <Badge variant="success">ON</Badge>
            <Button size="sm" variant="outline" onClick={() => disableTwoFa.mutate({ id: user.id })}>Isključi</Button>
          </div>
        ) : <Badge>OFF</Badge>}
      </td>
      <td className="px-3 py-2 text-xs">{user.roles.map((r: any) => `${r.rola.kod}×${r.pravnoLice.kod}`).join(", ")}</td>
      <td className="px-3 py-2 text-right">
        <Button size="sm" variant="ghost" onClick={() => {
          const np = prompt("Nova lozinka (min 8):");
          if (np && np.length >= 8) reset.mutate({ id: user.id, password: np });
        }}>Reset pw</Button>
      </td>
    </tr>
  );
}

function UserCreateDialog({ onClose, pravnaLica }: { onClose: () => void; pravnaLica: any[] }) {
  const mut = trpc.users.create.useMutation({ onSuccess: onClose });
  const [form, setForm] = useState({ email: "", ime: "", prezime: "", password: "", rolaKod: "SALES_REP", pravnoLiceId: pravnaLica[0]?.id ?? "", twoFaEnabled: false });
  const [err, setErr] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try { await mut.mutateAsync(form as any); } catch (e: any) { setErr(e.message); }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold">Novi korisnik</h2>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <Field label="Email *"><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Lozinka (≥8) *"><Input type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
          <Field label="Ime *"><Input required value={form.ime} onChange={(e) => setForm({ ...form, ime: e.target.value })} /></Field>
          <Field label="Prezime *"><Input required value={form.prezime} onChange={(e) => setForm({ ...form, prezime: e.target.value })} /></Field>
          <Field label="Rola *">
            <Select value={form.rolaKod} onChange={(e) => setForm({ ...form, rolaKod: e.target.value })}>
              <option value="ADMIN">Admin</option>
              <option value="COUNTRY_MANAGER">Country Manager</option>
              <option value="SALES_MANAGER">Sales Manager</option>
              <option value="SALES_REP">Sales Rep</option>
              <option value="FINANCE">Finance</option>
              <option value="READ_ONLY">Read-only</option>
            </Select>
          </Field>
          <Field label="Pravno lice *">
            <Select value={form.pravnoLiceId} onChange={(e) => setForm({ ...form, pravnoLiceId: e.target.value })}>
              {pravnaLica.map((p) => <option key={p.id} value={p.id}>{p.kod} — {p.naziv}</option>)}
            </Select>
          </Field>
          <Field label="2FA aktivno"><input className="h-4 w-4" type="checkbox" checked={form.twoFaEnabled} onChange={(e) => setForm({ ...form, twoFaEnabled: e.target.checked })} /></Field>
          {err && <p className="col-span-2 text-sm text-destructive">{err}</p>}
          <div className="col-span-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Otkaži</Button>
            <Button type="submit" disabled={mut.isPending}>Sačuvaj</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

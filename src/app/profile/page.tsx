"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function ProfilePage() {
  const me = trpc.users.me.useQuery();
  const begin = trpc.users.beginTwoFaSetup.useMutation();
  const confirm = trpc.users.confirmTwoFa.useMutation({ onSuccess: () => me.refetch() });
  const [token, setToken] = useState("");
  const [setup, setSetup] = useState<{ otpauth: string; secret: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!me.data) return <p>Učitavam...</p>;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Profil</h1>
      <div className="rounded-md border p-4 text-sm">
        <div><strong>Email:</strong> {me.data.email}</div>
        <div><strong>Ime:</strong> {me.data.ime} {me.data.prezime}</div>
        <div className="mt-2"><strong>Role:</strong> {me.data.roles.map((r: any) => `${r.rola.kod}×${r.pravnoLice.kod}`).join(", ")}</div>
      </div>
      <section className="rounded-md border p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Dvofaktorska autentifikacija (2FA)</h2>
          {me.data.twoFaEnabled ? <Badge variant="success">Aktivna</Badge> : <Badge>Isključena</Badge>}
        </div>
        {!me.data.twoFaEnabled && (
          <>
            {!setup ? (
              <Button onClick={async () => {
                setError(null);
                try { setSetup(await begin.mutateAsync()); } catch (e: any) { setError(e.message); }
              }}>Pokreni 2FA setup</Button>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-sm">Skeniraj QR u authenticator aplikaciji ili unesi secret ručno:</p>
                <div className="rounded-md border bg-secondary/40 p-3 text-xs">
                  <div><strong>Secret:</strong> <code className="font-mono">{setup.secret}</code></div>
                  <div className="mt-1 break-all"><strong>OTPAUTH URI:</strong> <code className="font-mono">{setup.otpauth}</code></div>
                </div>
                <Field label="Unesi 6-cifreni kod iz aplikacije">
                  <Input value={token} onChange={(e) => setToken(e.target.value)} maxLength={6} pattern="[0-9]{6}" />
                </Field>
                <Button disabled={token.length !== 6} onClick={async () => {
                  setError(null);
                  try { await confirm.mutateAsync({ token }); setSetup(null); setToken(""); } catch (e: any) { setError(e.message); }
                }}>Potvrdi 2FA</Button>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
